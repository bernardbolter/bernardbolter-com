'use client'

import { Button } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

import {
  ARTWORK_UPLOAD_COMPOSER_HINT,
  ARTWORK_UPLOAD_WAITING_PLACEHOLDER,
} from '@/lib/artOfficial/artworkUploadCopy'
import { messagesForDisplay } from '@/lib/artOfficial/chatMessages'
import { hasPrimaryImageStaged } from '@/lib/artOfficial/hasPrimaryImageStaged'
import { formatChatError } from '@/lib/artOfficial/formatChatError'
import { parseChatHttpError } from '@/lib/artOfficial/parseChatHttpError'
import {
  collapseTimelineToLatest,
  upsertTimelineEntry,
} from '@/lib/artOfficial/sessionTimeline'
import type { MediaUploadPayload } from '@/lib/artOfficial/stageArtworkMedia'
import type { StagedMediaAttachment } from '@/lib/artOfficial/stagedMedia'

import { AutoGrowTextarea } from './AutoGrowTextarea'
import { type AgentActivity, ChatAgentStatus } from './ChatAgentStatus'
import { ChatErrorBanner } from './ChatErrorBanner'
import { ComposerUploadBar } from './ComposerUploadBar'
import { ConfirmationPanel } from './ConfirmationPanel'
import { MediaUploadPanel } from './MediaUploadPanel'
import { MessageList } from './MessageList'
import { PreUploadPanel } from './PreUploadPanel'
import { SessionGuidePanel } from './SessionGuidePanel'
import { SessionSidebar } from './SessionSidebar'
import type { ArtOfficialSession, TimelineEntry } from './types'

import './artOfficialChat.scss'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function parseTimeline(session: ArtOfficialSession): TimelineEntry[] {
  if (!Array.isArray(session.fieldUpdateTimeline)) return []
  return collapseTimelineToLatest(session.fieldUpdateTimeline as TimelineEntry[])
}

function parseDisplayMessages(session: ArtOfficialSession): ChatMessage[] {
  const raw = session.messages
  if (!Array.isArray(raw)) return []
  return messagesForDisplay(
    raw.filter(
      (m): m is Parameters<typeof messagesForDisplay>[0][number] =>
        typeof m === 'object' && m !== null && 'role' in m,
    ),
  )
}

export function ChatPane({ initialSession }: { initialSession: ArtOfficialSession }) {
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    parseDisplayMessages(initialSession),
  )
  const [timeline, setTimeline] = useState<TimelineEntry[]>(() =>
    parseTimeline(initialSession),
  )
  const [pending, setPending] = useState('')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [chatErrorCode, setChatErrorCode] = useState<string | undefined>()
  const [agentActivity, setAgentActivity] = useState<AgentActivity>('idle')
  const [imageUploaded, setImageUploaded] = useState(() =>
    hasPrimaryImageStaged(parseTimeline(initialSession), initialSession.stagedMedia),
  )
  const errorRef = useRef<HTMLDivElement>(null)

  const isArtworkSession = session.sessionType === 'artwork-cataloguing'
  const isArtworkRefinement =
    isArtworkSession &&
    (typeof session.artworkRecord === 'number'
      ? session.artworkRecord > 0
      : typeof session.artworkRecord === 'object' && session.artworkRecord !== null)
  const hasFirstImpression = Boolean(session.firstImpression)
  const hasMessages = messages.length > 0 || Boolean(pending)
  const assistantTurns = messages.filter((m) => m.role === 'assistant').length
  const needsImageUpload = isArtworkSession && hasFirstImpression && !imageUploaded

  const sendChat = useCallback(
    async (
      userMessage: string,
      options?: {
        showUserInThread?: boolean
        imageMediaId?: number
        mediaUpload?: MediaUploadPayload
      },
    ) => {
      const showUserInThread = options?.showUserInThread !== false
      setSending(true)
      setAgentActivity('waiting')
      setChatError(null)
      setChatErrorCode(undefined)
      if (showUserInThread) {
        setMessages((m) => [...m, { role: 'user', content: userMessage }])
      }
      setPending('')

      try {
        const res = await fetch('/api/art-official/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.sessionId,
            userMessage,
            imageMediaId: options?.imageMediaId,
            mediaUpload: options?.mediaUpload,
          }),
        })

        if (!res.ok) {
          const rawText = await res.text()
          let body: unknown = {}
          try {
            body = JSON.parse(rawText)
          } catch {
            body = {}
          }
          const parsed = parseChatHttpError(res.status, body, rawText)
          setChatError(parsed.message)
          setChatErrorCode(parsed.code)
          setAgentActivity('error')
          return
        }

        if (!res.body) {
          setChatError('No response stream from server.')
          setChatErrorCode('SERVER_ERROR')
          setAgentActivity('error')
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let assistantText = ''
        let streamError: string | null = null
        let streamErrorCode: string | undefined

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })

          const parts = buf.split('\n\n')
          buf = parts.pop() ?? ''

          for (const evt of parts) {
            if (!evt.trim()) continue
            const lines = evt.split('\n')
            const type = lines[0]?.replace('event: ', '')
            const dataLine = lines.find((l) => l.startsWith('data: '))
            let data: Record<string, unknown> = {}
            if (dataLine) {
              try {
                data = JSON.parse(dataLine.replace('data: ', '')) as Record<
                  string,
                  unknown
                >
              } catch {
                data = {}
              }
            }

            if (type === 'error') {
              streamError =
                typeof data.message === 'string'
                  ? formatChatError(new Error(data.message))
                  : 'Chat error'
              streamErrorCode =
                typeof data.code === 'string' ? data.code : 'STREAM_ERROR'
              setAgentActivity('error')
            }

            if (type === 'token' && typeof data.text === 'string') {
              assistantText += data.text
              setPending(assistantText)
              setAgentActivity('streaming')
            }
            if (type === 'pre-upload-step' && typeof data.preUploadStep === 'number') {
              setSession((s) => ({ ...s, preUploadStep: data.preUploadStep as number }))
            }
            if (type === 'image-analysis') {
              setAgentActivity('analyzing')
            }
            if (type === 'tool-staged') {
              setAgentActivity('tools')
            }
            if (type === 'media-staged') {
              const attachment = data.attachment as StagedMediaAttachment | undefined
              if (attachment) {
                setSession((s) => {
                  const prev = Array.isArray(s.stagedMedia)
                    ? (s.stagedMedia as StagedMediaAttachment[])
                    : []
                  const next = attachment.kind === 'skipped'
                    ? [...prev.filter((r) => r.slotId !== attachment.slotId), attachment]
                    : [...prev, attachment]
                  return { ...s, stagedMedia: next }
                })
              }
              if (data.slotId === 'primary') {
                setImageUploaded(true)
              }
            }
            if (type === 'tool-staged' && data.name === 'update_field' && data.input) {
              const input = data.input as TimelineEntry
              setTimeline((t) =>
                upsertTimelineEntry(t, {
                  ...input,
                  timestamp: new Date().toISOString(),
                }),
              )
              if (input.field === 'primaryImage') {
                setImageUploaded(true)
              }
            }
            if (type === 'tool-staged' && data.name === 'store_session_field') {
              const input = data.input as { field?: string; value?: string }
              if (input.field === 'firstImpression') {
                setSession((s) => ({ ...s, firstImpression: input.value }))
              }
              if (input.field === 'secondDescription') {
                setSession((s) => ({ ...s, secondDescription: input.value }))
              }
              if (input.field === 'highlightedMediaSlot') {
                setSession((s) => ({ ...s, highlightedMediaSlot: input.value }))
              }
              if (input.field === 'preUploadStep' && input.value) {
                const step = Number(input.value)
                if (step >= 1 && step <= 4) {
                  setSession((s) => ({ ...s, preUploadStep: step }))
                }
              }
            }
            if (
              type === 'tool-staged' &&
              data.name === 'generate_confirmation_draft' &&
              data.input
            ) {
              const input = data.input as {
                agentDraftDescriptionShort?: string
                agentDraftDescriptionLong?: string
                agentDraftConceptualKeywords?: string[]
                agentDraftFormalContributionAssessment?: string
              }
              setSession((s) => ({
                ...s,
                agentDraftDescriptionShort: input.agentDraftDescriptionShort,
                agentDraftDescriptionLong: input.agentDraftDescriptionLong,
                agentDraftConceptualKeywords: input.agentDraftConceptualKeywords?.map(
                  (keyword) => ({ keyword }),
                ),
                agentDraftFormalContributionAssessment:
                  input.agentDraftFormalContributionAssessment,
              }))
            }
          }
        }

        if (streamError) {
          setChatError(streamError)
          setChatErrorCode(streamErrorCode)
          setAgentActivity('error')
        } else if (assistantText.trim()) {
          setMessages((m) => [...m, { role: 'assistant', content: assistantText }])
          setAgentActivity('idle')
        } else {
          setChatError(
            'No reply text was received. Check ANTHROPIC_API_KEY in .env, restart npm run dev, and try again.',
          )
          setChatErrorCode('STREAM_ERROR')
          setAgentActivity('error')
        }
        setPending('')
      } catch (e) {
        setChatError(formatChatError(e))
        setChatErrorCode('STREAM_ERROR')
        setAgentActivity('error')
      } finally {
        setSending(false)
      }
    },
    [session.sessionId],
  )

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    await sendChat(text)
  }

  async function onImageUploaded(mediaId: number) {
    await sendChat('I have uploaded the primary artwork image.', {
      mediaUpload: { slotId: 'primary', mediaId },
    })
  }

  async function onMediaAction(upload: MediaUploadPayload, label: string) {
    const userMessage = upload.skip
      ? `Not applicable: ${label}`
      : upload.url
        ? `Link added for ${label}: ${upload.url}`
        : `Uploaded: ${label}`
    await sendChat(userMessage, { mediaUpload: upload })
  }

  const displayActivity: AgentActivity = chatError
    ? 'error'
    : sending
      ? agentActivity
      : 'idle'

  const refinementBanner =
    session.dialogueRefinementFlag && session.weakPhases?.length ? (
      <p className="art-official-chat__refinement-banner">
        Refinement pass — weakness in: {session.weakPhases.join(', ')}
      </p>
    ) : null

  return (
    <div className="art-official-chat">
      <div className="art-official-chat__layout">
        <div className="art-official-chat__main">
          {refinementBanner}
          <SessionGuidePanel
            sessionType={session.sessionType}
            hasMessages={hasMessages}
            disabled={sending}
            isRefinement={isArtworkRefinement}
            onStart={(message) => void sendChat(message, { showUserInThread: false })}
          />
          {isArtworkSession && !isArtworkRefinement ? (
            <PreUploadPanel
              hasFirstImpression={hasFirstImpression}
              preUploadStep={session.preUploadStep}
              assistantTurns={assistantTurns}
              awaitingAssistant={sending && !hasFirstImpression}
              needsImageUpload={needsImageUpload}
            />
          ) : null}

          {isArtworkSession && hasFirstImpression ? (
            <MediaUploadPanel
              timeline={timeline}
              stagedMedia={session.stagedMedia}
              highlightedMediaSlot={session.highlightedMediaSlot}
              hasPrimary={imageUploaded}
              disabled={sending}
              onMediaAction={(upload, label) => void onMediaAction(upload, label)}
            />
          ) : null}

          <MessageList messages={messages} streaming={pending} />

          <div className="art-official-chat__composer-block">
            <ChatAgentStatus activity={displayActivity} />
            {needsImageUpload ? (
              <ComposerUploadBar onUploaded={onImageUploaded} disabled={sending} />
            ) : null}
            {chatError ? (
              <div ref={errorRef}>
                <ChatErrorBanner
                  message={chatError}
                  code={chatErrorCode}
                  onDismiss={() => {
                    setChatError(null)
                    setChatErrorCode(undefined)
                    setAgentActivity('idle')
                  }}
                />
              </div>
            ) : null}
            {needsImageUpload ? (
              <p className="art-official-chat__composer-hint art-official-chat__composer-hint--upload">
                {ARTWORK_UPLOAD_COMPOSER_HINT}
              </p>
            ) : null}
            <AutoGrowTextarea
              className="art-official-chat__composer"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending || needsImageUpload}
              placeholder={
                needsImageUpload
                  ? ARTWORK_UPLOAD_WAITING_PLACEHOLDER
                  : 'Type your message… (Enter for a new line, ⌘/Ctrl+Enter to send)'
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <div className="art-official-chat__actions">
              <Button
                buttonStyle="primary"
                disabled={sending || needsImageUpload || !input.trim()}
                onClick={send}
              >
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>

          <ConfirmationPanel
            session={session}
            timeline={timeline}
            onCommitted={() => router.push('/admin/art-official')}
          />
        </div>
        <SessionSidebar timeline={timeline} sessionType={session.sessionType ?? ''} />
      </div>
    </div>
  )
}

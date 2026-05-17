'use client'

import { Button } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { messagesForDisplay } from '@/lib/artOfficial/chatMessages'
import { formatChatError } from '@/lib/artOfficial/formatChatError'
import { parseChatHttpError } from '@/lib/artOfficial/parseChatHttpError'

import { AutoGrowTextarea } from './AutoGrowTextarea'
import { ChatErrorBanner } from './ChatErrorBanner'
import { ConfirmationPanel } from './ConfirmationPanel'
import { MessageList } from './MessageList'
import { PreUploadPanel } from './PreUploadPanel'
import { SessionGuidePanel } from './SessionGuidePanel'
import { SessionSidebar } from './SessionSidebar'
import type { ArtOfficialSession, TimelineEntry } from './types'

import './artOfficialChat.scss'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function parseTimeline(session: ArtOfficialSession): TimelineEntry[] {
  if (!Array.isArray(session.fieldUpdateTimeline)) return []
  return session.fieldUpdateTimeline as TimelineEntry[]
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  const isArtworkSession = session.sessionType === 'artwork-cataloguing'
  const hasFirstImpression = Boolean(session.firstImpression)
  const hasMessages = messages.length > 0 || Boolean(pending)

  const scrollToLatest = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  useEffect(() => {
    scrollToLatest()
  }, [messages, pending, scrollToLatest])

  useEffect(() => {
    if (chatError) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [chatError])

  const sendChat = useCallback(
    async (
      userMessage: string,
      imageMediaId?: number,
      options?: { showUserInThread?: boolean },
    ) => {
      const showUserInThread = options?.showUserInThread !== false
      setSending(true)
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
            imageMediaId,
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
          return
        }

        if (!res.body) {
          setChatError('No response stream from server.')
          setChatErrorCode('SERVER_ERROR')
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
            }

            if (type === 'token' && typeof data.text === 'string') {
              assistantText += data.text
              setPending(assistantText)
            }
            if (type === 'tool-staged' && data.name === 'update_field' && data.input) {
              const input = data.input as TimelineEntry
              setTimeline((t) => [
                ...t,
                { ...input, timestamp: new Date().toISOString() },
              ])
            }
            if (type === 'tool-staged' && data.name === 'store_session_field') {
              const input = data.input as { field?: string; value?: string }
              if (input.field === 'firstImpression') {
                setSession((s) => ({ ...s, firstImpression: input.value }))
              }
            }
          }
        }

        if (streamError) {
          setChatError(streamError)
          setChatErrorCode(streamErrorCode)
        } else if (assistantText.trim()) {
          setMessages((m) => [...m, { role: 'assistant', content: assistantText }])
        } else {
          setChatError(
            'No reply text was received. Check ANTHROPIC_API_KEY in .env, restart npm run dev, and try again.',
          )
          setChatErrorCode('STREAM_ERROR')
        }
        setPending('')
      } catch (e) {
        setChatError(formatChatError(e))
        setChatErrorCode('STREAM_ERROR')
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
    await sendChat('I have uploaded the artwork image.', mediaId)
  }

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
          {!isArtworkSession ? (
            <SessionGuidePanel
              sessionType={session.sessionType}
              hasMessages={hasMessages}
              disabled={sending}
              onStart={(message) =>
                void sendChat(message, undefined, { showUserInThread: false })
              }
            />
          ) : null}
          {isArtworkSession ? (
            <PreUploadPanel
              hasFirstImpression={hasFirstImpression}
              onImageUploaded={onImageUploaded}
            />
          ) : null}

          <MessageList messages={messages} streaming={pending} />
          <div ref={messagesEndRef} aria-hidden />

          <div className="art-official-chat__composer-block">
            {chatError ? (
              <div ref={errorRef}>
                <ChatErrorBanner
                  message={chatError}
                  code={chatErrorCode}
                  onDismiss={() => {
                    setChatError(null)
                    setChatErrorCode(undefined)
                  }}
                />
              </div>
            ) : null}
            <AutoGrowTextarea
              className="art-official-chat__composer"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              placeholder="Type your message… (Enter for a new line, ⌘/Ctrl+Enter to send)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <div className="art-official-chat__actions">
              <Button buttonStyle="primary" disabled={sending || !input.trim()} onClick={send}>
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

'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import { ConfirmationPanel } from './ConfirmationPanel'
import { MessageList } from './MessageList'
import { PreUploadPanel } from './PreUploadPanel'
import { SessionSidebar } from './SessionSidebar'
import type { ArtOfficialSession, TimelineEntry } from './types'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function parseTimeline(session: ArtOfficialSession): TimelineEntry[] {
  if (!Array.isArray(session.fieldUpdateTimeline)) return []
  return session.fieldUpdateTimeline as TimelineEntry[]
}

export function ChatPane({ initialSession }: { initialSession: ArtOfficialSession }) {
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const raw = initialSession.messages
    if (!Array.isArray(raw)) return []
    return raw
      .filter((m): m is ChatMessage => {
        return (
          typeof m === 'object' &&
          m !== null &&
          'role' in m &&
          'content' in m &&
          (m.role === 'user' || m.role === 'assistant')
        )
      })
      .map((m) => ({ role: m.role, content: String(m.content) }))
  })
  const [timeline, setTimeline] = useState<TimelineEntry[]>(() =>
    parseTimeline(initialSession),
  )
  const [pending, setPending] = useState('')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const isArtworkSession = session.sessionType === 'artwork-cataloguing'
  const hasFirstImpression = Boolean(session.firstImpression)

  const sendChat = useCallback(
    async (userMessage: string, imageMediaId?: number) => {
      setSending(true)
      setMessages((m) => [...m, { role: 'user', content: userMessage }])
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
        if (!res.ok || !res.body) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let assistantText = ''

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
            const data = dataLine
              ? (JSON.parse(dataLine.replace('data: ', '')) as Record<string, unknown>)
              : {}

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

        if (assistantText) {
          setMessages((m) => [...m, { role: 'assistant', content: assistantText }])
        }
        setPending('')
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
      <p
        style={{
          padding: 12,
          marginBottom: 16,
          background: 'var(--theme-warning-100)',
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        Refinement pass — weakness in: {session.weakPhases.join(', ')}
      </p>
    ) : null

  return (
    <div>
      {refinementBanner}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div>
          <MessageList messages={messages} streaming={pending} />
          {isArtworkSession ? (
            <PreUploadPanel
              hasFirstImpression={hasFirstImpression}
              onImageUploaded={onImageUploaded}
            />
          ) : null}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            disabled={sending}
            placeholder="Type your message…"
            style={{ width: '100%', marginTop: 8 }}
          />
          <button type="button" onClick={send} disabled={sending || !input.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </button>
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

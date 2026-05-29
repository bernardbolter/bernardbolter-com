'use client'

import { useCallback, useState } from 'react'

import { getSessionKickoff } from '@/lib/artOfficial/sessionKickoff'

type EpisodeChatPanelProps = {
  episodeId: number
  sessionType: 'episode-storyboard' | 'episode-assembly'
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export function EpisodeChatPanel({ episodeId, sessionType }: EpisodeChatPanelProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kickoff = getSessionKickoff(sessionType)

  const sendMessage = useCallback(async (sid: string, userMessage: string, showUser = true) => {
    setBusy(true)
    setError(null)
    if (showUser) setMessages((m) => [...m, { role: 'user', content: userMessage }])
    try {
      const res = await fetch('/api/art-official/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, userMessage }),
      })
      if (!res.ok || !res.body) throw new Error('Chat failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let assistant = ''
      setMessages((m) => [...m, { role: 'assistant', content: '' }])

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
          if (!dataLine) continue
          let data: { text?: string; message?: string } = {}
          try {
            data = JSON.parse(dataLine.replace('data: ', '')) as { text?: string; message?: string }
          } catch {
            continue
          }
          if (type === 'error') {
            throw new Error(data.message ?? 'Chat error')
          }
          if (type === 'token' && data.text) {
            assistant += data.text
            setMessages((m) => {
              const copy = [...m]
              copy[copy.length - 1] = { role: 'assistant', content: assistant }
              return copy
            })
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed')
    } finally {
      setBusy(false)
    }
  }, [])

  const startSession = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/studio/episodes/${episodeId}/sessions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionType }),
      })
      const data = (await res.json()) as { sessionId?: string; error?: string }
      if (!res.ok || !data.sessionId) throw new Error(data.error || 'Could not start session')
      setSessionId(data.sessionId)
      if (kickoff?.message) {
        await sendMessage(data.sessionId, kickoff.message, false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start failed')
    } finally {
      setBusy(false)
    }
  }, [episodeId, sessionType, kickoff?.message, sendMessage])

  async function commit() {
    if (!sessionId) return
    setBusy(true)
    try {
      const res = await fetch(`/api/art-official/sessions/${sessionId}/commit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || 'Commit failed')
      }
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="studio-chat">
      <h3>{kickoff?.title ?? sessionType}</h3>
      {kickoff?.intro ? <p className="studio-muted">{kickoff.intro}</p> : null}
      {!sessionId ? (
        <button type="button" className="studio-form__submit" disabled={busy} onClick={() => void startSession()}>
          {kickoff?.buttonLabel ?? 'Start session'}
        </button>
      ) : (
        <>
          <div className="studio-chat__messages">
            {messages.map((m, i) => (
              <p key={i} className={`studio-chat__bubble studio-chat__bubble--${m.role}`}>
                {m.content}
              </p>
            ))}
          </div>
          <form
            className="studio-chat__composer"
            onSubmit={(e) => {
              e.preventDefault()
              if (!input.trim() || !sessionId) return
              void sendMessage(sessionId, input.trim())
              setInput('')
            }}
          >
            <input
              value={input}
              disabled={busy}
              placeholder="Reply…"
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={busy}>
              Send
            </button>
          </form>
          <button type="button" className="studio-form__submit" disabled={busy} onClick={() => void commit()}>
            Commit to episode
          </button>
        </>
      )}
      {error ? <p className="studio-form__error">{error}</p> : null}
    </section>
  )
}

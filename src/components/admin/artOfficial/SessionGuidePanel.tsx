'use client'

import { Button } from '@payloadcms/ui'

import { getSessionKickoff, type SessionKickoff } from '@/lib/artOfficial/sessionKickoff'

export function SessionGuidePanel({
  sessionType,
  hasMessages,
  disabled,
  isRefinement,
  onStart,
}: {
  sessionType: string | null | undefined
  hasMessages: boolean
  disabled?: boolean
  isRefinement?: boolean
  onStart: (message: string) => void
}) {
  const kickoff = getSessionKickoff(sessionType, isRefinement)
  if (!kickoff) return null

  if (!hasMessages) {
    return (
      <SessionGuideBody kickoff={kickoff} disabled={disabled} onStart={onStart} showBegin />
    )
  }

  return (
    <details className="art-official-chat__guide art-official-chat__guide--compact">
      <summary className="art-official-chat__guide-summary">{kickoff.title} — session guide</summary>
      <div className="art-official-chat__guide-body">
        <SessionGuideBody kickoff={kickoff} disabled={disabled} onStart={onStart} showBegin={false} />
      </div>
    </details>
  )
}

function SessionGuideBody({
  kickoff,
  disabled,
  onStart,
  showBegin,
}: {
  kickoff: SessionKickoff
  disabled?: boolean
  onStart: (message: string) => void
  showBegin: boolean
}) {
  return (
    <section className="art-official-chat__starter">
      <h2 className="art-official-chat__starter-title">{kickoff.title}</h2>
      <p className="art-official-chat__starter-intro">{kickoff.intro}</p>
      {kickoff.topics?.length ? (
        <>
          <p className="art-official-chat__starter-topics-label">Topics covered</p>
          <ul className="art-official-chat__starter-topics">
            {kickoff.topics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </>
      ) : null}
      {showBegin ? (
        <>
          <Button
            buttonStyle="primary"
            disabled={disabled}
            onClick={() => onStart(kickoff.message)}
          >
            {disabled ? 'Starting…' : kickoff.buttonLabel}
          </Button>
          <p className="art-official-chat__starter-hint">
            Or type your own opening message below and press Send.
          </p>
        </>
      ) : null}
    </section>
  )
}

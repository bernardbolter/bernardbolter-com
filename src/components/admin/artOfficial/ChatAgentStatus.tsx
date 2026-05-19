'use client'

import './artOfficialChat.scss'

export type AgentActivity =
  | 'idle'
  | 'waiting'
  | 'streaming'
  | 'tools'
  | 'analyzing'
  | 'error'

const LABELS: Record<AgentActivity, string> = {
  idle: 'Ready',
  waiting: 'Art/Official is thinking…',
  streaming: 'Art/Official is replying…',
  tools: 'Updating staged fields…',
  analyzing: 'Analysing your image…',
  error: 'Something went wrong',
}

export function ChatAgentStatus({ activity }: { activity: AgentActivity }) {
  const label = LABELS[activity]

  return (
    <div
      className={[
        'art-official-chat__status',
        `art-official-chat__status--${activity}`,
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className="art-official-chat__status-dot" aria-hidden />
      <span className="art-official-chat__status-label">{label}</span>
    </div>
  )
}

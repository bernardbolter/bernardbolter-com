'use client'

import './artOfficialChat.scss'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

function MessageBubble({
  role,
  content,
  faded,
}: {
  role: 'user' | 'assistant'
  content: string
  faded?: boolean
}) {
  const isUser = role === 'user'
  return (
    <div
      className={[
        'art-official-chat__bubble',
        isUser ? 'art-official-chat__bubble--user' : '',
        faded ? 'art-official-chat__bubble--faded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="art-official-chat__bubble-label">
        {isUser ? 'You' : 'Art/Official'}
      </span>
      {content}
    </div>
  )
}

export function MessageList({
  messages,
  streaming,
}: {
  messages: Message[]
  streaming: string
}) {
  return (
    <div className="art-official-chat__messages">
      {messages.map((m, i) => (
        <MessageBubble key={i} role={m.role} content={m.content} />
      ))}
      {streaming ? (
        <MessageBubble role="assistant" content={streaming} faded />
      ) : null}
    </div>
  )
}

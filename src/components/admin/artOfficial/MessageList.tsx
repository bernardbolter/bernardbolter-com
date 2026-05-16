'use client'

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
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: 8,
        background: isUser
          ? 'var(--theme-elevation-150)'
          : 'var(--theme-elevation-50)',
        opacity: faded ? 0.7 : 1,
        whiteSpace: 'pre-wrap',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ display: 'block', marginBottom: 4, fontSize: 11, opacity: 0.6 }}>
        {isUser ? 'You' : 'Art/Official'}
      </strong>
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
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}
    >
      {messages.map((m, i) => (
        <MessageBubble key={i} role={m.role} content={m.content} />
      ))}
      {streaming ? (
        <MessageBubble role="assistant" content={streaming} faded />
      ) : null}
    </div>
  )
}

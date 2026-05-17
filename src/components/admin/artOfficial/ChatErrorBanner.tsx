'use client'

const STEPS_BY_CODE: Record<string, string[]> = {
  UNAUTHORIZED: [
    'Log in at /admin again.',
    'Reopen your Art/Official session from the link in “In progress”.',
  ],
  NO_ARTIST: [
    'Open Collections → Artists and ensure one Artist row exists.',
    'Start a new Biography session from Art/Official.',
  ],
  PRECONDITION: [
    'Confirm an Artist record exists.',
    'If Practice Knowledge rows are missing, run: npx tsx src/scripts/seed-practice-knowledge.ts',
  ],
  RATE_LIMIT: ['Wait about a minute.', 'Send your message again.'],
  SERVER_ERROR: [
    'Refresh this page — your transcript is usually already saved on the session.',
    'Check the terminal where npm run dev is running for a red error line.',
    'Send again; if it fails, copy the terminal error for debugging.',
  ],
  STREAM_ERROR: [
    'Your last message may still be in the thread — read above before resending.',
    'Refresh and continue the session, or send a shorter follow-up.',
  ],
}

const DEFAULT_STEPS = [
  'Refresh the page and scroll the chat — earlier messages are often still there.',
  'Send your message again once.',
  'If it fails again, check the dev server terminal (npm run dev) for errors.',
]

export function ChatErrorBanner({
  message,
  code,
  onDismiss,
}: {
  message: string
  code?: string
  onDismiss?: () => void
}) {
  const steps = (code && STEPS_BY_CODE[code]) || DEFAULT_STEPS

  return (
    <div className="art-official-chat__error" role="alert">
      <p className="art-official-chat__error-title">Something went wrong</p>
      <p className="art-official-chat__error-message">{message}</p>
      <p className="art-official-chat__error-steps-title">What to try</p>
      <ol className="art-official-chat__error-steps">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {onDismiss ? (
        <button type="button" className="art-official-chat__error-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </div>
  )
}

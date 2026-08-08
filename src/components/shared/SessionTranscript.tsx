import {
  SESSION_TRANSCRIPT_VISIBLE_COUNT,
  messagesForPublicTranscript,
  sessionTranscriptRoleLabel,
  type SessionTranscriptTurn,
} from '@/lib/corpus/sessionTranscript'

import './session-transcript.css'

type Props = {
  messages: unknown
  /** Messages shown before the collapsed remainder. */
  visibleCount?: number
  heading?: string
  className?: string
}

function Turn({ turn }: { turn: SessionTranscriptTurn }) {
  return (
    <li
      className={`session-transcript__turn session-transcript__turn--${turn.role}`}
    >
      <span className="session-transcript__role">
        {sessionTranscriptRoleLabel(turn.role)}
      </span>
      <p className="session-transcript__content">{turn.content}</p>
    </li>
  )
}

/**
 * Full Art/Official transcript for public SSR pages.
 * Entire conversation is in the initial HTML; only visibility is collapsed.
 * Reusable for /sessions/[id] and future artwork-page embeds.
 */
export default function SessionTranscript({
  messages,
  visibleCount = SESSION_TRANSCRIPT_VISIBLE_COUNT,
  heading = 'Transcript',
  className,
}: Props) {
  const turns = messagesForPublicTranscript(messages)
  if (turns.length === 0) return null

  const preview = turns.slice(0, visibleCount)
  const remainder = turns.slice(visibleCount)

  return (
    <section
      className={['session-transcript', className].filter(Boolean).join(' ')}
      aria-label={heading}
    >
      <h2 className="still-being-written__heading">{heading}</h2>
      <ol className="session-transcript__list">
        {preview.map((turn, index) => (
          <Turn key={`preview-${index}`} turn={turn} />
        ))}
      </ol>
      {remainder.length > 0 ? (
        <details className="session-transcript__more">
          <summary className="session-transcript__expand">
            Expand full conversation
          </summary>
          <ol
            className="session-transcript__list"
            start={preview.length + 1}
          >
            {remainder.map((turn, index) => (
              <Turn key={`rest-${index}`} turn={turn} />
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  )
}

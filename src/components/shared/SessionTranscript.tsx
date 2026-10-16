import {
  messagesForPublicTranscript,
  prepareFieldsWrittenDisplay,
  resolveTranscriptPreviewCount,
  sessionTranscriptRoleLabel,
  type SessionTranscriptTurn,
} from '@/lib/corpus/sessionTranscript'

import './session-transcript.css'

type Props = {
  messages: unknown
  /**
   * Override preview length. Default: upload-beat cut, else 24.
   * Pass a number only when a caller needs a fixed cut.
   */
  visibleCount?: number
  heading?: string
  className?: string
  /** When false, omit the inner Transcript heading (page supplies framing). */
  showHeading?: boolean
}

function FieldsWrittenLine({ fields }: { fields: string[] }) {
  const display = prepareFieldsWrittenDisplay(fields)
  if (!display) return null

  if (display.hiddenCount === 0) {
    return <p className="session-transcript__fields">{display.summary}</p>
  }

  return (
    <details className="session-transcript__fields session-transcript__fields--expandable">
      <summary className="session-transcript__fields-summary">{display.summary}</summary>
      <p className="session-transcript__fields-all">
        wrote {display.allNames.join(', ')}
      </p>
    </details>
  )
}

function Turn({ turn }: { turn: SessionTranscriptTurn }) {
  const speaker = sessionTranscriptRoleLabel(turn.role)

  return (
    <li
      className={`session-transcript__turn session-transcript__turn--${turn.role}`}
    >
      <span className="session-transcript__role">{speaker}</span>
      <p className="session-transcript__content">{turn.content}</p>
      {turn.role === 'user' && turn.fieldsWritten?.length ? (
        <FieldsWrittenLine fields={turn.fieldsWritten} />
      ) : null}
    </li>
  )
}

/**
 * Full Art/Official transcript for public SSR pages.
 * Entire conversation is in the initial HTML; only visibility is collapsed.
 * Reusable for /sessions/[id] and artwork-page embeds.
 */
export default function SessionTranscript({
  messages,
  visibleCount,
  heading = 'Transcript',
  className,
  showHeading = true,
}: Props) {
  const turns = messagesForPublicTranscript(messages)
  if (turns.length === 0) return null

  const previewCount = visibleCount ?? resolveTranscriptPreviewCount(turns)
  const preview = turns.slice(0, previewCount)
  const remainder = turns.slice(previewCount)

  return (
    <section
      className={['session-transcript', className].filter(Boolean).join(' ')}
      aria-label={heading}
    >
      {showHeading ? (
        <h2 className="still-being-written__heading">{heading}</h2>
      ) : null}
      <ol className="session-transcript__list">
        {preview.map((turn, index) => (
          <Turn key={`preview-${index}`} turn={turn} />
        ))}
      </ol>
      {remainder.length > 0 ? (
        <details className="session-transcript__more">
          <summary className="session-transcript__expand">
            Show the remaining {remainder.length} turn
            {remainder.length === 1 ? '' : 's'}
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

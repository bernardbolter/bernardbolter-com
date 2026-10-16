import Link from 'next/link'

import SessionTranscript from '@/components/shared/SessionTranscript'
import {
  formatSessionCompletedLabel,
  formatSessionPageTitle,
} from '@/lib/corpus/sessionPageTitle'
import { messagesForPublicTranscript } from '@/lib/corpus/sessionTranscript'
import type { ArtworkPageSession } from '@/lib/payload/artworkPageSessions'

type Props = {
  artworkSlug: string
  artworkTitle: string
  primarySessions: ArtworkPageSession[]
  mentionedSessions: ArtworkPageSession[]
  /** When false, omit outer section chrome (used inside dialogue columns). */
  wrapSection?: boolean
  /**
   * When true (artwork page making-layer), page framing owns the section
   * heading — render transcripts without a second “Art/Official sessions” h2.
   */
  framedByPage?: boolean
}

function MentionRow({ session }: { session: ArtworkPageSession }) {
  const primaryTitle = session.primaryArtwork?.title?.trim() || 'Artwork'
  const label = formatSessionPageTitle({
    artworkTitle: primaryTitle,
    completedAt: session.completedAt,
  })
  return (
    <li>
      <Link href={`/sessions/${session.sessionId}`} className="bio__inline-link">
        {label}
      </Link>
    </li>
  )
}

function sessionHasPublicTurns(session: ArtworkPageSession): boolean {
  return messagesForPublicTranscript(session.messages).length > 0
}

function CanonicalFootnote({
  href,
  dateLabel,
}: {
  href: string
  dateLabel: string | null
}) {
  return (
    <p className="artwork-page__session-canonical">
      Copy of the{' '}
      <Link href={href} className="bio__inline-link">
        session record
      </Link>
      {dateLabel ? ` (${dateLabel})` : ''}. Canonical:{' '}
      <Link href={href} className="bio__inline-link">
        {href}
      </Link>
    </p>
  )
}

/**
 * Server-only: primary transcripts inline; mention-only sessions as links.
 * Never receives private session streams.
 * Sessions with zero public turns are omitted (no empty transcript shell).
 */
export default function ArtworkSessionsSection({
  artworkSlug,
  artworkTitle,
  primarySessions,
  mentionedSessions,
  wrapSection = true,
  framedByPage = false,
}: Props) {
  const primaryWithTurns = primarySessions.filter(sessionHasPublicTurns)
  if (primaryWithTurns.length === 0 && mentionedSessions.length === 0) return null

  const body = (
    <>
      {primaryWithTurns.length > 0 ? (
        <>
          {!framedByPage ? (
            <h2 className="still-being-written__heading">Art/Official sessions</h2>
          ) : null}
          {primaryWithTurns.map((session) => {
            const dateLabel = formatSessionCompletedLabel(session.completedAt)
            const title = formatSessionPageTitle({
              artworkTitle,
              completedAt: session.completedAt,
            })
            const canonicalHref = `/sessions/${session.sessionId}`
            return (
              <div key={session.id} className="artwork-page__session-block">
                <h3 className="artwork-page__session-title">
                  <Link href={canonicalHref} className="bio__inline-link">
                    {title}
                  </Link>
                </h3>
                <SessionTranscript
                  messages={session.messages}
                  heading="Transcript"
                  showHeading={!framedByPage}
                />
                <CanonicalFootnote href={canonicalHref} dateLabel={dateLabel} />
              </div>
            )
          })}
        </>
      ) : null}

      {mentionedSessions.length > 0 ? (
        <>
          <h2 className="still-being-written__heading">Also mentioned in</h2>
          <ul className="artwork-page__session-mentions">
            {mentionedSessions.map((session) => (
              <MentionRow key={session.id} session={session} />
            ))}
          </ul>
        </>
      ) : null}

      <p className="corpus-page__links" style={{ marginTop: '1rem' }}>
        <Link
          href={`/sessions?artwork=${encodeURIComponent(artworkSlug)}`}
          className="still-being-written__session-link"
        >
          All sessions for this work
        </Link>
      </p>
    </>
  )

  if (!wrapSection) return <div className="artwork-page__sessions-body">{body}</div>

  return (
    <section
      id="sessions"
      className="artwork-page__layer artwork-page__sessions"
      aria-label="Sessions"
    >
      <div className="artwork-page__inner">{body}</div>
    </section>
  )
}

/** Char count of public transcript turns — for sticky / length comparison. */
export function primarySessionsTranscriptChars(sessions: ArtworkPageSession[]): number {
  let total = 0
  for (const session of sessions) {
    for (const turn of messagesForPublicTranscript(session.messages)) {
      total += turn.content.length
    }
  }
  return total
}

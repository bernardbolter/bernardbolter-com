import Link from 'next/link'

import SessionTranscript from '@/components/shared/SessionTranscript'
import {
  formatSessionCompletedLabel,
  formatSessionPageTitle,
} from '@/lib/corpus/sessionPageTitle'
import type { ArtworkPageSession } from '@/lib/payload/artworkPageSessions'

type Props = {
  artworkSlug: string
  artworkTitle: string
  primarySessions: ArtworkPageSession[]
  mentionedSessions: ArtworkPageSession[]
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

/**
 * Server-only: primary transcripts inline; mention-only sessions as links.
 * Never receives private session streams.
 */
export default function ArtworkSessionsSection({
  artworkSlug,
  artworkTitle,
  primarySessions,
  mentionedSessions,
}: Props) {
  if (primarySessions.length === 0 && mentionedSessions.length === 0) return null

  return (
    <section className="artwork-page__layer artwork-page__sessions" aria-label="Sessions">
      <div className="artwork-page__inner">
        {primarySessions.length > 0 ? (
          <>
            <h2 className="still-being-written__heading">Art/Official sessions</h2>
            {primarySessions.map((session) => {
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
                  <p className="bio__masonry-caption">
                    This is a copy of the{' '}
                    <Link href={canonicalHref} className="bio__inline-link">
                      session record
                    </Link>
                    {dateLabel ? `, ${dateLabel}` : ''}. Canonical URL:{' '}
                    <Link href={canonicalHref} className="bio__inline-link">
                      {canonicalHref}
                    </Link>
                    .
                  </p>
                  <SessionTranscript
                    messages={session.messages}
                    heading="Transcript"
                  />
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
            href={`/${artworkSlug}/sessions`}
            className="still-being-written__session-link"
          >
            All sessions for this work
          </Link>
        </p>
      </div>
    </section>
  )
}

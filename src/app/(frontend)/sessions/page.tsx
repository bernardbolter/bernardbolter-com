import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import CorpusLadder from '@/components/corpus/CorpusLadder'
import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import type { Artwork } from '@/payload-types'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Sessions',
  description: 'Completed Art/Official sessions — public crumbs only, no transcripts.',
  alternates: { canonical: '/sessions' },
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readArtwork(value: number | Artwork | null | undefined): Artwork | null {
  if (!value || typeof value !== 'object') return null
  return value
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

type SessionCrumb = {
  id: number
  sessionId: string
  sessionType: string
  completedAt?: string | null
}

type SessionRow = {
  session: SessionCrumb
  primary: Artwork | null
  mentioned: Artwork[]
}

export default async function SessionsIndexPage({ searchParams }: PageProps) {
  const raw = await searchParams
  const artworkSlug = firstParam(raw.artwork)?.trim() || null

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'sessions',
    where: { status: { equals: 'completed' } },
    limit: 200,
    depth: 1,
    sort: '-completedAt',
    select: {
      sessionId: true,
      sessionType: true,
      status: true,
      completedAt: true,
      primaryArtwork: true,
      artworkRecord: true,
      mentionedArtworks: true,
    },
  })

  let rows: SessionRow[] = result.docs
    .filter((session) => Boolean(session.sessionId))
    .map((session) => {
      const primary =
        readArtwork(session.primaryArtwork) ?? readArtwork(session.artworkRecord)
      const mentioned = (session.mentionedArtworks ?? [])
        .map((entry) => readArtwork(entry))
        .filter((artwork): artwork is Artwork => artwork !== null)
      return {
        session: {
          id: session.id,
          sessionId: session.sessionId as string,
          sessionType: session.sessionType,
          completedAt: session.completedAt,
        },
        primary,
        mentioned,
      }
    })

  if (artworkSlug) {
    rows = rows.filter((row) => {
      if (row.primary?.slug === artworkSlug) return true
      return row.mentioned.some((artwork) => artwork.slug === artworkSlug)
    })
  }

  return (
    <div className="bio-page__container">
      <DocumentScrollShell
        title="SESSIONS"
        closeHref="/corpus"
        scrollClassName="bio-container"
        closeClassName="bio__close-container"
      >
        <div className="bio__content-container corpus-page">
          <CorpusLadder slug={artworkSlug} current="sessions" />
          <p className="bio__tagline">
            {artworkSlug ? `Sessions for ${artworkSlug}` : 'Completed sessions'}
          </p>
          <p className="bio__masonry-caption corpus-page__lede">
            Public crumbs only — type, date, linked works. Transcripts stay private.
          </p>
          {artworkSlug ? (
            <p className="bio__masonry-caption">
              <Link href="/sessions" className="bio__inline-link">
                Show all sessions
              </Link>
            </p>
          ) : null}

          <ul className="corpus-page__list">
            {rows.map(({ session, primary, mentioned }) => {
              const dateLabel = session.completedAt
                ? new Date(session.completedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'
              return (
                <li key={session.id} className="corpus-page__row">
                  <div className="corpus-page__meta">
                    <span className="corpus-page__year">{dateLabel}</span>
                    <span className="corpus-page__status">{session.sessionType}</span>
                  </div>
                  <div className="corpus-page__body">
                    <Link
                      href={`/sessions/${session.sessionId}`}
                      className="corpus-page__title"
                    >
                      Session {session.sessionId.slice(0, 8)}…
                    </Link>
                    {primary ? (
                      <p className="bio__masonry-caption">
                        Primary:{' '}
                        <Link href={`/${primary.slug}`} className="bio__inline-link">
                          {primary.title}
                        </Link>
                      </p>
                    ) : null}
                    {mentioned.length > 0 ? (
                      <p className="bio__masonry-caption">
                        Mentioned: {mentioned.map((a) => a.title).join(', ')}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          {rows.length === 0 ? (
            <p className="bio__masonry-caption">No completed sessions match.</p>
          ) : null}
        </div>
      </DocumentScrollShell>
    </div>
  )
}

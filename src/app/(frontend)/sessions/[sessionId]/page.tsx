import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import type { Artwork } from '@/payload-types'

export const revalidate = 3600

type PageProps = { params: Promise<{ sessionId: string }> }

function readArtwork(value: number | Artwork | null | undefined): Artwork | null {
  if (!value || typeof value !== 'object') return null
  return value
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sessionId } = await params
  return {
    title: 'Session',
    alternates: { canonical: `/sessions/${sessionId}` },
  }
}

export default async function PublicSessionPage({ params }: PageProps) {
  const { sessionId } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { sessionId: { equals: sessionId } },
        { status: { equals: 'completed' } },
      ],
    },
    limit: 1,
    depth: 1,
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

  const session = result.docs[0]
  if (!session) notFound()

  const primary =
    readArtwork(session.primaryArtwork) ?? readArtwork(session.artworkRecord)
  const mentioned = (session.mentionedArtworks ?? [])
    .map((entry) => readArtwork(entry))
    .filter((artwork): artwork is Artwork => artwork !== null)

  const completedLabel = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="bio-page__container">
      <DocumentScrollShell
        title="SESSION"
        closeHref="/bio"
        scrollClassName="bio-container"
        closeClassName="bio__close-container"
      >
        <div className="bio__content-container">
          <p className="bio__tagline">{session.sessionType.replace(/-/g, ' ')}</p>
          {completedLabel ? (
            <p className="bio__masonry-caption">Completed {completedLabel}</p>
          ) : null}

          <div className="bio__main-content" style={{ paddingTop: '1.5rem' }}>
            {primary ? (
              <p>
                Primary work:{' '}
                <Link href={`/${primary.slug}`} className="bio__inline-link">
                  {primary.title}
                </Link>
              </p>
            ) : null}
            {mentioned.length > 0 ? (
              <p>
                Also mentioned:{' '}
                {mentioned.map((artwork, index) => (
                  <span key={artwork.id}>
                    {index > 0 ? ', ' : ''}
                    <Link href={`/${artwork.slug}`} className="bio__inline-link">
                      {artwork.title}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
            {!primary && mentioned.length === 0 ? (
              <p className="bio__masonry-caption">
                This session contributed facts to the archive without a primary artwork.
              </p>
            ) : null}
          </div>
        </div>
      </DocumentScrollShell>
    </div>
  )
}

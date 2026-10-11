import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import CorpusLadder from '@/components/corpus/CorpusLadder'
import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import SessionTranscript from '@/components/shared/SessionTranscript'
import { buildSessionJsonLd, sessionTier5ApiPath } from '@/lib/corpus/buildTier5SessionsResponse'
import {
  formatSessionCompletedLabel,
  formatSessionPageTitle,
} from '@/lib/corpus/sessionPageTitle'
import { resolveArtworkSeo } from '@/lib/artwork/seo'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { maybePermanentRedirect } from '@/lib/redirects/maybeRedirect'
import type { Artwork } from '@/payload-types'

export const revalidate = 3600

type PageProps = { params: Promise<{ sessionId: string }> }

function readArtwork(value: number | Artwork | null | undefined): Artwork | null {
  if (!value || typeof value !== 'object') return null
  return value
}

async function loadCompletedSession(sessionId: string) {
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
      createdAt: true,
      completedAt: true,
      primaryArtwork: true,
      artworkRecord: true,
      mentionedArtworks: true,
      messages: true,
    },
  })
  return result.docs[0] ?? null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sessionId } = await params
  const session = await loadCompletedSession(sessionId)
  if (!session) {
    return {
      title: 'Session',
      alternates: { canonical: `/sessions/${sessionId}` },
    }
  }
  const primary =
    readArtwork(session.primaryArtwork) ?? readArtwork(session.artworkRecord)
  const pageTitle = formatSessionPageTitle({
    artworkTitle: primary?.title,
    completedAt: session.completedAt,
  })
  const artworkSeo = primary ? resolveArtworkSeo(primary) : null
  const description =
    artworkSeo?.description ||
    `Art/Official session record${
      primary?.title ? ` for ${primary.title}` : ''
    }. Full transcript on this page; machine JSON via the corpus Tier 5 API.`
  const title = `${pageTitle} | Bernard Bolter`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/sessions/${sessionId}` },
    openGraph: {
      title: pageTitle,
      description,
      url: `/sessions/${sessionId}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
    },
  }
}

export default async function PublicSessionPage({ params }: PageProps) {
  const { sessionId } = await params
  const payload = await getPayload({ config })
  const session = await loadCompletedSession(sessionId)
  if (!session) {
    await maybePermanentRedirect(payload, `/sessions/${sessionId}`)
    notFound()
  }

  const primary =
    readArtwork(session.primaryArtwork) ?? readArtwork(session.artworkRecord)
  const mentioned = (session.mentionedArtworks ?? [])
    .map((entry) => readArtwork(entry))
    .filter((artwork): artwork is Artwork => artwork !== null)

  const completedLabel = formatSessionCompletedLabel(session.completedAt)
  const pageTitle = formatSessionPageTitle({
    artworkTitle: primary?.title,
    completedAt: session.completedAt,
  })

  const ladderSlug = primary?.slug ?? mentioned[0]?.slug ?? null
  const baseUrl = getSiteBaseUrl()
  const jsonLd = buildSessionJsonLd(session, baseUrl)
  const tier5Href = session.sessionId
    ? sessionTier5ApiPath(session.sessionId)
    : null
  const artworkTier5Href = primary?.slug
    ? `/api/corpus/${encodeURIComponent(primary.slug)}/sessions`
    : null

  return (
    <div className="bio-page__container">
      {jsonLd ? <JsonLdScript data={jsonLd} /> : null}
      <DocumentScrollShell
        title="SESSION"
        closeHref="/sessions"
        scrollClassName="bio-container"
        closeClassName="bio__close-container"
      >
        <div className="bio__content-container">
          <CorpusLadder slug={ladderSlug} current="sessions" />
          <h1 className="bio__tagline">{pageTitle}</h1>
          <p className="bio__masonry-caption">{session.sessionType.replace(/-/g, ' ')}</p>
          {completedLabel ? (
            <p className="bio__masonry-caption">Completed {completedLabel}</p>
          ) : null}
          <p className="bio__masonry-caption">
            Human-readable crumb. Full transcripts are public via the machine endpoint below.
          </p>

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
            {artworkTier5Href ? (
              <p style={{ paddingTop: '1rem' }} className="corpus-page__links">
                <a href={artworkTier5Href} className="still-being-written__session-link">
                  Full session data (JSON)
                </a>
                {tier5Href ? (
                  <a href={tier5Href} className="still-being-written__session-link">
                    This session (JSON)
                  </a>
                ) : null}
              </p>
            ) : tier5Href ? (
              <p style={{ paddingTop: '1rem' }} className="corpus-page__links">
                <a href={tier5Href} className="still-being-written__session-link">
                  Full session data (JSON)
                </a>
              </p>
            ) : null}

            <SessionTranscript messages={session.messages} />
          </div>
        </div>
      </DocumentScrollShell>
    </div>
  )
}

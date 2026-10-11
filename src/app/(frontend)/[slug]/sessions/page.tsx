import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CorpusLadder from '@/components/corpus/CorpusLadder'
import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import { resolveArtworkSeo } from '@/lib/artwork/seo'
import {
  formatSessionCompletedLabel,
  formatSessionPageTitle,
} from '@/lib/corpus/sessionPageTitle'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getArtworkPageSessions } from '@/lib/payload/artworkPageSessions'
import { getArtworkForPage } from '@/lib/payload/artworkPage'
import { isReservedFrontendSlug } from '@/lib/routes/reservedFrontendSlugs'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (isReservedFrontendSlug(slug)) return { title: 'Not found' }
  const artwork = await getArtworkForPage(slug)
  if (!artwork) return { title: 'Sessions not found' }
  const workTitle = artwork.title?.trim() || 'Artwork'
  const title = `${workTitle} — Sessions`
  const seo = resolveArtworkSeo(artwork)
  const description = seo.description || `Art/Official sessions for ${workTitle}.`
  const canonical = `${getSiteBaseUrl()}/${slug}/sessions`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function ArtworkSessionsIndexPage({ params }: Props) {
  const { slug } = await params
  if (isReservedFrontendSlug(slug)) notFound()

  const artwork = await getArtworkForPage(slug)
  if (!artwork || artwork.status !== 'published' || typeof artwork.id !== 'number') {
    notFound()
  }

  const { primary, mentioned } = await getArtworkPageSessions(artwork.id, slug)
  const artworkTitle = artwork.title?.trim() || 'Artwork'

  return (
    <div className="bio-page__container">
      <DocumentScrollShell
        title="SESSIONS"
        closeHref={`/${slug}`}
        scrollClassName="bio-container"
        closeClassName="bio__close-container"
      >
        <div className="bio__content-container corpus-page">
          <CorpusLadder slug={slug} current="sessions" />
          <p className="bio__tagline">Sessions for {artworkTitle}</p>
          <p className="bio__masonry-caption corpus-page__lede">
            Path-based index for this work. Canonical transcripts live at{' '}
            <Link href="/sessions" className="bio__inline-link">
              /sessions
            </Link>
            ; filter view also at{' '}
            <Link
              href={`/sessions?artwork=${encodeURIComponent(slug)}`}
              className="bio__inline-link"
            >
              /sessions?artwork={slug}
            </Link>
            .
          </p>

          <h2 className="still-being-written__heading">Primary</h2>
          {primary.length === 0 ? (
            <p className="bio__masonry-caption">No completed primary sessions.</p>
          ) : (
            <ul className="corpus-page__list">
              {primary.map((session) => {
                const label = formatSessionPageTitle({
                  artworkTitle,
                  completedAt: session.completedAt,
                })
                const dateLabel = formatSessionCompletedLabel(session.completedAt)
                return (
                  <li key={session.id} className="corpus-page__row">
                    <div className="corpus-page__meta">
                      <span className="corpus-page__year">{dateLabel ?? '—'}</span>
                      <span className="corpus-page__status">{session.sessionType}</span>
                    </div>
                    <div className="corpus-page__body">
                      <Link
                        href={`/sessions/${session.sessionId}`}
                        className="bio__inline-link"
                      >
                        {label}
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <h2 className="still-being-written__heading">Mentioned</h2>
          {mentioned.length === 0 ? (
            <p className="bio__masonry-caption">Not mentioned in other sessions.</p>
          ) : (
            <ul className="corpus-page__list">
              {mentioned.map((session) => {
                const primaryTitle = session.primaryArtwork?.title?.trim() || 'Artwork'
                const label = formatSessionPageTitle({
                  artworkTitle: primaryTitle,
                  completedAt: session.completedAt,
                })
                const dateLabel = formatSessionCompletedLabel(session.completedAt)
                return (
                  <li key={session.id} className="corpus-page__row">
                    <div className="corpus-page__meta">
                      <span className="corpus-page__year">{dateLabel ?? '—'}</span>
                      <span className="corpus-page__status">{session.sessionType}</span>
                    </div>
                    <div className="corpus-page__body">
                      <Link
                        href={`/sessions/${session.sessionId}`}
                        className="bio__inline-link"
                      >
                        {label}
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="corpus-page__links" style={{ marginTop: '1.5rem' }}>
            <Link href={`/${slug}`} className="still-being-written__session-link">
              Artwork
            </Link>
            <Link href={`/${slug}/record`} className="still-being-written__session-link">
              Record
            </Link>
            <Link href={`/${slug}/vision`} className="still-being-written__session-link">
              Vision
            </Link>
          </p>
        </div>
      </DocumentScrollShell>
    </div>
  )
}

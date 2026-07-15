import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import CorpusLadder from '@/components/corpus/CorpusLadder'
import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import { resolveVisionAnalyses } from '@/lib/artwork/visionPage'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getArtworkForPage, getPublishedArtworkSlugs } from '@/lib/payload/artworkPage'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const slugs = await getPublishedArtworkSlugs()
    return slugs.map((slug) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const artwork = await getArtworkForPage(slug)
  if (!artwork) return { title: 'Record not found' }
  return {
    title: `${artwork.title} — Record`,
    description: `Public structured record for ${artwork.title}.`,
    alternates: { canonical: `/${slug}/record` },
  }
}

export default async function ArtworkRecordPage({ params }: Props) {
  const { slug } = await params
  const artwork = await getArtworkForPage(slug)
  if (!artwork || artwork.status !== 'published') notFound()

  const baseUrl = getSiteBaseUrl()
  const jsonLd = buildArtworkJsonLd(artwork, null, { baseUrl })
  const analyses = resolveVisionAnalyses(artwork)
  const seriesName =
    artwork.series && typeof artwork.series === 'object' ? artwork.series.name : null
  const medium = resolveMediumLabel(artwork) || artwork.medium

  return (
    <div className="bio-page__container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DocumentScrollShell
        title="RECORD"
        closeHref={`/${slug}`}
        scrollClassName="bio-container"
        closeClassName="bio__close-container"
      >
        <div className="bio__content-container corpus-page">
          <CorpusLadder slug={slug} current="record" />
          <p className="bio__tagline">{artwork.title}</p>
          <p className="bio__masonry-caption corpus-page__lede">
            Tier 4 — public structured record. Private commerce and provenance fields are omitted.
          </p>

          <dl className="corpus-record__facts">
            <div>
              <dt>Year</dt>
              <dd>{artwork.yearCreated ?? '—'}</dd>
            </div>
            <div>
              <dt>Catalogue</dt>
              <dd>{artwork.catalogueNumber ?? '—'}</dd>
            </div>
            <div>
              <dt>Series</dt>
              <dd>{seriesName ?? '—'}</dd>
            </div>
            <div>
              <dt>Medium</dt>
              <dd>{medium ?? '—'}</dd>
            </div>
            <div>
              <dt>Reasoning</dt>
              <dd>{artwork.reasoningStatus ?? '—'}</dd>
            </div>
          </dl>

          {artwork.intent?.trim() ? (
            <section className="corpus-record__section">
              <h2 className="still-being-written__heading">Intent</h2>
              <p className="bio__main-content" style={{ paddingBottom: '1rem' }}>
                {artwork.intent.trim()}
              </p>
            </section>
          ) : null}

          {artwork.formalContributionAssessment?.trim() ? (
            <section className="corpus-record__section">
              <h2 className="still-being-written__heading">Formal contribution</h2>
              <p className="bio__main-content" style={{ paddingBottom: '1rem' }}>
                {artwork.formalContributionAssessment.trim()}
              </p>
            </section>
          ) : null}

          <section className="corpus-record__section">
            <h2 className="still-being-written__heading">Vision analyses</h2>
            {analyses.length === 0 ? (
              <p className="bio__masonry-caption">None yet.</p>
            ) : (
              <ul className="corpus-page__list">
                {analyses.map((entry, index) => (
                  <li key={`${entry.date}-${entry.model}-${index}`} className="corpus-page__row">
                    <div className="corpus-page__meta">
                      <span className="corpus-page__year">
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="corpus-page__status">{entry.model}</span>
                    </div>
                    <div className="corpus-page__body">
                      <p className="bio__masonry-caption">{entry.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="corpus-page__links">
            <Link href={`/${slug}`} className="still-being-written__session-link">
              Artwork
            </Link>
            <Link href={`/${slug}/vision`} className="still-being-written__session-link">
              Vision
            </Link>
            <Link
              href={`/sessions?artwork=${encodeURIComponent(slug)}`}
              className="still-being-written__session-link"
            >
              Sessions
            </Link>
          </p>
        </div>
      </DocumentScrollShell>
    </div>
  )
}

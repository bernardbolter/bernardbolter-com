import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import ArtworkPage from '@/components/artwork/ArtworkPage'
import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import {
  getArtworkForPage,
  getPublishedArtworkSlugs,
} from '@/lib/payload/artworkPage'
import { getPerson } from '@/lib/payload/person'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'

export const revalidate = 3600

export async function generateStaticParams() {
  try {
    const slugs = await getPublishedArtworkSlugs()
    return slugs.map((slug) => ({ slug }))
  } catch {
    return []
  }
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const artwork = await getArtworkForPage(slug)
  if (!artwork) return { title: 'Record not found' }
  const isStub = artwork.reasoningStatus === 'stub'
  const base = getSiteBaseUrl()
  return {
    title: `${artwork.title} — Record`,
    description: `Public structured record for ${artwork.title}.`,
    // Canonical is the artwork page — /record is a plain-text mirror.
    alternates: { canonical: `${base}/${slug}` },
    ...(isStub ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function ArtworkRecordPage({ params }: Props) {
  const { slug } = await params
  const [artwork, artist] = await Promise.all([
    getArtworkForPage(slug),
    getPerson(),
  ])
  if (!artwork || artwork.status !== 'published') notFound()

  const baseUrl = getSiteBaseUrl()
  const jsonLd = buildArtworkJsonLd(artwork, artist, {
    baseUrl,
    includeTraversalLinks: true,
  })

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
        <div className="bio__content-container corpus-page artwork-plain-record-shell">
          <ArtworkPage artwork={artwork} artist={artist} variant="plain" />
        </div>
      </DocumentScrollShell>
    </div>
  )
}

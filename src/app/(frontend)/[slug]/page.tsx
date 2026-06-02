import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import ArtworkContent from '@/components/artworks/ArtworkContent'
import { resolveArtworkSeo } from '@/lib/artwork/seo'
import { buildArtworkJsonLd } from '@/lib/jsonld/artwork'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getArtistRecord, getPublishedArtworkBySlug } from '@/lib/payload/siteDocuments'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const artwork = await getPublishedArtworkBySlug(slug)
  if (!artwork) {
    return { title: 'Artwork' }
  }

  const base = getSiteBaseUrl()
  const seo = resolveArtworkSeo(artwork)
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: `${base}/${slug}` },
  }
}

export default async function ArtworkPage({ params }: Props) {
  const { slug } = await params
  const [artwork, artist] = await Promise.all([getPublishedArtworkBySlug(slug), getArtistRecord()])
  if (!artwork) notFound()

  const jsonLd = buildArtworkJsonLd(artwork, artist)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArtworkContent artwork={artwork} />
    </>
  )
}

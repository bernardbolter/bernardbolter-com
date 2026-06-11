import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import ArtworkPage from '@/components/artwork/ArtworkPage'
import { resolveArtworkSeo } from '@/lib/artwork/seo'
import { buildArtworkJsonLd } from '@/lib/jsonld/artwork'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import {
  getPublishedArtworkForPage,
  getPublishedArtworkSlugs,
} from '@/lib/payload/artworkPage'
import { getArtistRecord } from '@/lib/payload/siteDocuments'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await getPublishedArtworkSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const artwork = await getPublishedArtworkForPage(slug)
  if (!artwork) {
    return { title: 'Artwork not found' }
  }

  const base = getSiteBaseUrl()
  const seo = resolveArtworkSeo(artwork)
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: `${base}/${slug}` },
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const [artwork, artist] = await Promise.all([
    getPublishedArtworkForPage(slug),
    getArtistRecord(),
  ])
  if (!artwork) notFound()

  const jsonLd = buildArtworkJsonLd(artwork, artist)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArtworkPage artwork={artwork} artist={artist} />
    </>
  )
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import ArtworkPage from '@/components/artwork/ArtworkPage'
import Info from '@/components/info/Info'
import { resolveArtworkMenuPlusColor } from '@/lib/artwork/artworkMenuPlusColor'
import { resolveArtworkSeo } from '@/lib/artwork/seo'
import { ArtworkPageChromeProvider } from '@/providers/ArtworkPageChromeContext'
import { buildArtworkJsonLd } from '@/lib/jsonld/artwork'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import {
  getArtworkForPage,
  getPublishedArtworkSlugs,
} from '@/lib/payload/artworkPage'
import { getArtistRecord } from '@/lib/payload/siteDocuments'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const slugs = await getPublishedArtworkSlugs()
    return slugs.map((slug) => ({ slug }))
  } catch {
    // Allow builds to proceed when DB is unavailable; pages will render on demand.
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const artwork = await getArtworkForPage(slug)
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
    getArtworkForPage(slug),
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
      <ArtworkPageChromeProvider menuPlusColor={resolveArtworkMenuPlusColor(artwork)}>
        <div className="artwork-page__layout">
          <Info />
          <ArtworkPage artwork={artwork} artist={artist} />
        </div>
      </ArtworkPageChromeProvider>
    </>
  )
}

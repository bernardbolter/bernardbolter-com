import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import EmbeddingPage from '@/components/artwork/EmbeddingPage'
import { resolveArtworkMenuPlusColor } from '@/lib/artwork/artworkMenuPlusColor'
import { buildVisualEmbeddingJsonLd } from '@/lib/jsonld/visualEmbedding'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getArtworkForPage, getPublishedArtworkSlugs } from '@/lib/payload/artworkPage'
import { fetchArtworkClipEmbeddingRecord } from '@/lib/payload/clipEmbedding'
import { getSimilarArtworksForPage } from '@/lib/payload/similarArtworksPage'
import { ArtworkPageChromeProvider } from '@/providers/ArtworkPageChromeContext'

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
  if (!artwork) {
    return { title: 'Artwork not found' }
  }

  const base = getSiteBaseUrl()
  const title = artwork.title?.trim() || 'Artwork'
  return {
    title: `${title} — Visual embedding`,
    description: `CLIP visual embedding for ${title}.`,
    alternates: { canonical: `${base}/${slug}/embedding` },
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const artwork = await getArtworkForPage(slug)
  if (!artwork || typeof artwork.id !== 'number') notFound()

  const clipRecord = await fetchArtworkClipEmbeddingRecord(artwork.id)
  const embedding = clipRecord?.embedding ?? null
  const similarWorks = embedding?.length
    ? await getSimilarArtworksForPage(artwork.id, 3)
    : []

  const baseUrl = getSiteBaseUrl()
  const artworkUrl = `${baseUrl}/${slug}`
  const artworkTitle = artwork.title?.trim() || 'Artwork'
  const jsonLd = embedding?.length
    ? buildVisualEmbeddingJsonLd(artwork, artworkUrl, embedding, clipRecord?.generatedAt)
    : null

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <ArtworkPageChromeProvider
        menuPlusColor={resolveArtworkMenuPlusColor(artwork)}
        navBackLink={{
          href: `/${slug}`,
          label: `Back to ${artworkTitle}`,
        }}
      >
        <div className="bio-page__container">
          <EmbeddingPage
            artwork={artwork}
            embedding={embedding}
            generatedAt={clipRecord?.generatedAt}
            similarWorks={similarWorks}
          />
        </div>
      </ArtworkPageChromeProvider>
    </>
  )
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import VisionPage from '@/components/artwork/VisionPage'
import CorpusLadder from '@/components/corpus/CorpusLadder'
import { resolveArtworkMenuPlusColor } from '@/lib/artwork/artworkMenuPlusColor'
import { getDirectR2ImageUrl } from '@/lib/artwork/visionPage'
import { buildVisionPageJsonLd } from '@/lib/jsonld/visionPage'
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
  const directImageUrl = getDirectR2ImageUrl(artwork)

  return {
    title: `${title} — Vision`,
    description: `Visual embeddings and vision analyses for ${title}.`,
    alternates: { canonical: `${base}/${slug}/vision` },
    ...(directImageUrl
      ? {
          icons: {
            other: [{ rel: 'image', url: directImageUrl }],
          },
        }
      : {}),
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const artwork = await getArtworkForPage(slug)
  if (!artwork || typeof artwork.id !== 'number') notFound()

  const clipRecord = await fetchArtworkClipEmbeddingRecord(artwork.id)
  const vectorsByColumn: Record<string, number[]> = {}
  const similarWorksByColumn: Record<string, Awaited<ReturnType<typeof getSimilarArtworksForPage>>> =
    {}

  if (clipRecord?.embedding?.length) {
    vectorsByColumn.clip_embedding = clipRecord.embedding
    similarWorksByColumn.clip_embedding = await getSimilarArtworksForPage(artwork.id, 3)
  }

  const baseUrl = getSiteBaseUrl()
  const artworkUrl = `${baseUrl}/${slug}`
  const artworkTitle = artwork.title?.trim() || 'Artwork'
  const directImageUrl = getDirectR2ImageUrl(artwork)
  const jsonLd = buildVisionPageJsonLd(artwork, artworkUrl, vectorsByColumn)

  return (
    <>
      {directImageUrl ? <link rel="image" href={directImageUrl} /> : null}
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
          <div className="corpus-ladder-wrap">
            <CorpusLadder slug={slug} current="vision" />
          </div>
          <VisionPage
            artwork={artwork}
            vectorsByColumn={vectorsByColumn}
            similarWorksByColumn={similarWorksByColumn}
          />
        </div>
      </ArtworkPageChromeProvider>
    </>
  )
}

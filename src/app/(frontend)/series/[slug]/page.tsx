import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import Artworks from '@/components/artworks/Artworks'
import { Nav } from '@/components/navs'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getArtworks } from '@/lib/payload/artworks'
import { getCollectionLayoutData } from '@/lib/payload/layoutData'
import { getPerson } from '@/lib/payload/person'
import { getSeriesBySlug } from '@/lib/payload/seriesPage'
import { getPublishedSeriesSlugs } from '@/lib/payload/staticParams'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { corpusAlternateTypes, corpusIndexUrl } from '@/lib/seo/corpusDiscovery'
import { CollectionArtworksProvider } from '@/providers/ArtworkProvider'
import { generateSeriesJsonLd } from '@/utilities/generateSeriesJsonLd'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const slugs = await getPublishedSeriesSlugs()
    return slugs.map((slug) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const series = await getSeriesBySlug(slug)
  if (!series) {
    return { title: 'Series not found' }
  }

  const description = lexicalToPlain(series.description).replace(/\s+/g, ' ').trim()

  return {
    title: series.name,
    description: description || `${series.name} — artworks by Bernard Bolter.`,
    alternates: {
      canonical: `/series/${slug}`,
      ...corpusAlternateTypes(corpusIndexUrl()),
    },
  }
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params
  const [series, artist, seriesArtworks, collection] = await Promise.all([
    getSeriesBySlug(slug),
    getPerson(),
    getArtworks(slug),
    getCollectionLayoutData(),
  ])
  if (!series) notFound()

  const jsonLd = artist ? generateSeriesJsonLd(series, artist, { baseUrl: getSiteBaseUrl() }) : null

  return (
    <CollectionArtworksProvider
      artworks={seriesArtworks}
      filterSeries={collection.filterSeries}
      timelineMarkers={collection.timelineMarkers}
      initialFiltersArray={[series.slug]}
    >
      <main className="relative min-h-screen w-full overflow-hidden bg-surface-page text-dark">
        {jsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null}
        <Nav />
        <Artworks />
      </main>
    </CollectionArtworksProvider>
  )
}

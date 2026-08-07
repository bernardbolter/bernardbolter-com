import type { Metadata } from 'next'

import HomePage from '@/components/home/HomePage'
import { CorpusDiscoveryLink } from '@/components/seo/CorpusDiscoveryLink'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getCollectionLayoutData } from '@/lib/payload/layoutData'
import { CollectionArtworksProvider } from '@/providers/ArtworkProvider'
import { corpusAlternateTypes, corpusIndexUrl } from '@/lib/seo/corpusDiscovery'

const baseUrl = getSiteBaseUrl().replace(/\/$/, '')

const homeDescription =
  "Explore Bernard Bolter's cityscape artworks: a timeline of paintings, drawings, and mixed media from 1992 to present. Original art for sale and exhibitions."
const homeOgDescription = 'Timeline of cityscape artworks by Bernard Bolter.'
const homeTwitterDescription = 'Explore abstract artworks from 1980 to present.'
const homeOgTitle = "Bernard Bolter's Art Portfolio"

/** Homepage keeps distinct document title vs OG title — do not collapse via buildPageMetadata. */
export const metadata: Metadata = {
  title: {
    absolute: "Bernard Bolter's Web Portal",
  },
  description: homeDescription,
  alternates: {
    canonical: '/',
    ...corpusAlternateTypes(corpusIndexUrl()),
  },
  openGraph: {
    title: homeOgTitle,
    description: homeOgDescription,
    url: baseUrl,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: homeOgTitle,
    description: homeTwitterDescription,
  },
}

export default async function Page() {
  const { artworks, filterSeries, timelineMarkers } = await getCollectionLayoutData()

  return (
    <CollectionArtworksProvider
      artworks={artworks}
      filterSeries={filterSeries}
      timelineMarkers={timelineMarkers}
    >
      {/* Crawler-only entry — optically hidden, zero layout impact */}
      <CorpusDiscoveryLink />
      <HomePage />
    </CollectionArtworksProvider>
  )
}

import type { Metadata } from 'next'

import HomePage from '@/components/home/HomePage'
import { CorpusDiscoveryLink } from '@/components/seo/CorpusDiscoveryLink'
import { getCollectionLayoutData } from '@/lib/payload/layoutData'
import { CollectionArtworksProvider } from '@/providers/ArtworkProvider'
import { corpusAlternateTypes, corpusIndexUrl } from '@/lib/seo/corpusDiscovery'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
    ...corpusAlternateTypes(corpusIndexUrl()),
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

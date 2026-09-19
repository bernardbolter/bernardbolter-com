import type { Metadata } from 'next'

import HomePage from '@/components/home/HomePage'
import { CorpusDiscoveryLink } from '@/components/seo/CorpusDiscoveryLink'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getCollectionLayoutData } from '@/lib/payload/layoutData'
import { withDbUnavailableFallback } from '@/lib/payload/buildSafeDb'
import { getPerson } from '@/lib/payload/person'
import { CollectionArtworksProvider } from '@/providers/ArtworkProvider'
import { corpusAlternateTypes, corpusIndexUrl } from '@/lib/seo/corpusDiscovery'
import { buildHomeJsonLd } from '@/utilities/buildHomeJsonLd'

const baseUrl = getSiteBaseUrl().replace(/\/$/, '')

const homeTitle = 'Bernard Bolter — artist archive'
const homeDescription =
  'The artist archive of Bernard Bolter: a catalogue of paintings, drawings, and mixed media from 1992 to present, with identity, series, and coverage for every work.'

export const revalidate = 3600

/** Homepage title and description are archive framing — not a portfolio or shop. */
export const metadata: Metadata = {
  title: {
    absolute: homeTitle,
  },
  description: homeDescription,
  alternates: {
    canonical: '/',
    ...corpusAlternateTypes(corpusIndexUrl()),
  },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: baseUrl,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: homeTitle,
    description: homeDescription,
  },
}

export default async function Page() {
  const [{ artworks, filterSeries, timelineMarkers, cataloguedCount }, artist] = await Promise.all([
    getCollectionLayoutData(),
    withDbUnavailableFallback(() => getPerson(), null),
  ])
  const jsonLd = buildHomeJsonLd(artist, { baseUrl })

  return (
    <CollectionArtworksProvider
      artworks={artworks}
      filterSeries={filterSeries}
      timelineMarkers={timelineMarkers}
      cataloguedCount={cataloguedCount}
    >
      <JsonLdScript data={jsonLd} />
      {/* Crawler-only entry — optically hidden, zero layout impact */}
      <CorpusDiscoveryLink />
      <HomePage />
    </CollectionArtworksProvider>
  )
}

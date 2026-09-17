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

const homeDescription =
  "Explore Bernard Bolter's cityscape artworks: a timeline of paintings, drawings, and mixed media from 1992 to present. Original art for sale and exhibitions."
const homeOgDescription = 'Timeline of cityscape artworks by Bernard Bolter.'
const homeTwitterDescription = 'Explore abstract artworks from 1980 to present.'
const homeOgTitle = "Bernard Bolter's Art Portfolio"

export const revalidate = 3600

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
  const [{ artworks, filterSeries, timelineMarkers }, artist] = await Promise.all([
    getCollectionLayoutData(),
    withDbUnavailableFallback(() => getPerson(), null),
  ])
  const jsonLd = buildHomeJsonLd(artist, { baseUrl })

  return (
    <CollectionArtworksProvider
      artworks={artworks}
      filterSeries={filterSeries}
      timelineMarkers={timelineMarkers}
    >
      <JsonLdScript data={jsonLd} />
      {/* Crawler-only entry — optically hidden, zero layout impact */}
      <CorpusDiscoveryLink />
      <HomePage />
    </CollectionArtworksProvider>
  )
}

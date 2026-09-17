import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'

import { mapArtistToInfoData } from '@/helpers/mapArtistInfo'
import {
  fetchCatalogueArtworksWithPayload,
  type LayoutProviderArtworks,
} from '@/lib/payload/artworks'
import { fetchFilterSeriesWithPayload } from '@/lib/payload/series'
import { withDbRetry } from '@/lib/payload/withDbRetry'
import type { ArtistInfoData, FilterCategory } from '@/types/frontend'
import type { Artist } from '@/payload-types'
import { TIER_FALLBACK_AREA_MM2 } from '@/lib/artwork/gridRealSize'

export type LayoutProviderData = {
  artworks: LayoutProviderArtworks
  person: Artist | null
  artistInfo: ArtistInfoData
  filterSeries: FilterCategory[]
  seriesSlugByArtworkSlug: Record<string, string>
  archiveMedianAreaMm2: number
}

/** Lightweight root-layout payload — no catalogue rows for RSC. */
export type RootChromeData = {
  person: Artist | null
  artistInfo: ArtistInfoData
  seriesSlugByArtworkSlug: Record<string, string>
  archiveMedianAreaMm2: number
}

/** Route-level collection payload for `/` and `/series/[slug]`. */
export type CollectionLayoutData = {
  artworks: LayoutProviderArtworks
  filterSeries: FilterCategory[]
}

export const EMPTY_LAYOUT_PROVIDER_DATA: LayoutProviderData = {
  artworks: [],
  person: null,
  artistInfo: mapArtistToInfoData(null),
  filterSeries: [],
  seriesSlugByArtworkSlug: {},
  archiveMedianAreaMm2: TIER_FALLBACK_AREA_MM2.md,
}

export const EMPTY_ROOT_CHROME_DATA: RootChromeData = {
  person: null,
  artistInfo: EMPTY_LAYOUT_PROVIDER_DATA.artistInfo,
  seriesSlugByArtworkSlug: {},
  archiveMedianAreaMm2: TIER_FALLBACK_AREA_MM2.md,
}

export const EMPTY_COLLECTION_LAYOUT_DATA: CollectionLayoutData = {
  artworks: [],
  filterSeries: [],
}

async function fetchRootChromeData(): Promise<RootChromeData> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })

    const artistResult = await payload.find({
      collection: 'artists',
      limit: 1,
      depth: 0,
      overrideAccess: false,
    })

    const person = artistResult.docs[0] ?? null

    return {
      person,
      artistInfo: mapArtistToInfoData(person),
      // Catalogue fills these in CollectionArtworksProvider — do not fetch 500
      // artwork rows here in parallel with getCollectionLayoutData (pool stall).
      seriesSlugByArtworkSlug: {},
      archiveMedianAreaMm2: TIER_FALLBACK_AREA_MM2.md,
    }
  })
}

let collectionInflight: Promise<CollectionLayoutData> | null = null

async function fetchCollectionLayoutData(): Promise<CollectionLayoutData> {
  if (collectionInflight) return collectionInflight

  collectionInflight = withDbRetry(async () => {
    const payload = await getPayload({ config })

    const [artworks, filterSeries] = await Promise.all([
      fetchCatalogueArtworksWithPayload(payload),
      fetchFilterSeriesWithPayload(payload),
    ])

    return { artworks, filterSeries }
  }).finally(() => {
    collectionInflight = null
  })

  return collectionInflight
}

/** Root layout: artist record only — catalogue is a separate cached fetch. */
export const getRootChromeData = cache(async (): Promise<RootChromeData> => {
  try {
    return await fetchRootChromeData()
  } catch (err) {
    console.error('[layout-chrome-data] falling back to empty data', err)
    return { ...EMPTY_ROOT_CHROME_DATA }
  }
})

/** `/` and series pages: full catalogue + filter chips. */
export const getCollectionLayoutData = cache(async (): Promise<CollectionLayoutData> => {
  try {
    return await fetchCollectionLayoutData()
  } catch (err) {
    console.error('[layout-collection-data] falling back to empty data', err)
    return { ...EMPTY_COLLECTION_LAYOUT_DATA }
  }
})

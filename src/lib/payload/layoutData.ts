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

export type LayoutProviderData = {
  artworks: LayoutProviderArtworks
  person: Artist | null
  artistInfo: ArtistInfoData
  filterSeries: FilterCategory[]
}

export const EMPTY_LAYOUT_PROVIDER_DATA: LayoutProviderData = {
  artworks: [],
  person: null,
  artistInfo: mapArtistToInfoData(null),
  filterSeries: [],
}

async function fetchLayoutProviderData(): Promise<LayoutProviderData> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })

    const artworks = await fetchCatalogueArtworksWithPayload(payload)
    const artistResult = await payload.find({
      collection: 'artists',
      limit: 1,
      depth: 0,
      overrideAccess: false,
    })
    const filterSeries = await fetchFilterSeriesWithPayload(payload)

    const person = artistResult.docs[0] ?? null

    return {
      artworks,
      person,
      artistInfo: mapArtistToInfoData(person),
      filterSeries,
    }
  })
}

/** Single-connection fetch for root layout (avoids parallel getPayload pool exhaustion). */
export async function getLayoutProviderData(): Promise<LayoutProviderData> {
  try {
    return await fetchLayoutProviderData()
  } catch (err) {
    console.error('[layout-provider-data] falling back to empty data', err)
    return { ...EMPTY_LAYOUT_PROVIDER_DATA }
  }
}

import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'

import { computeArchiveMedianAreaMm2 } from '@/lib/artwork/archiveMedianArea'
import { buildSeriesSlugByArtworkSlug } from '@/lib/artwork/seriesSlugMap'
import { mapArtistToInfoData } from '@/helpers/mapArtistInfo'
import {
  fetchCatalogueArtworksWithPayload,
  type LayoutProviderArtworks,
} from '@/lib/payload/artworks'
import { fetchFilterSeriesWithPayload } from '@/lib/payload/series'
import { withDbRetry } from '@/lib/payload/withDbRetry'
import type { ArtistInfoData, FilterCategory, TimelineMarkersData } from '@/types/frontend'
import type { Artist } from '@/payload-types'
import { TIER_FALLBACK_AREA_MM2 } from '@/lib/artwork/gridRealSize'

export type LayoutProviderData = {
  artworks: LayoutProviderArtworks
  person: Artist | null
  artistInfo: ArtistInfoData
  timelineMarkers: TimelineMarkersData
  filterSeries: FilterCategory[]
  seriesSlugByArtworkSlug: Record<string, string>
  archiveMedianAreaMm2: number
}

/** Lightweight root-layout payload — no catalogue rows for RSC. */
export type RootChromeData = {
  artistInfo: ArtistInfoData
  seriesSlugByArtworkSlug: Record<string, string>
  archiveMedianAreaMm2: number
}

/** Route-level collection payload for `/` and `/series/[slug]`. */
export type CollectionLayoutData = {
  artworks: LayoutProviderArtworks
  filterSeries: FilterCategory[]
  timelineMarkers: TimelineMarkersData
}

export const EMPTY_LAYOUT_PROVIDER_DATA: LayoutProviderData = {
  artworks: [],
  person: null,
  artistInfo: mapArtistToInfoData(null),
  timelineMarkers: { bioEntries: [], throughlines: [], historicalReadings: [] },
  filterSeries: [],
  seriesSlugByArtworkSlug: {},
  archiveMedianAreaMm2: TIER_FALLBACK_AREA_MM2.md,
}

export const EMPTY_ROOT_CHROME_DATA: RootChromeData = {
  artistInfo: EMPTY_LAYOUT_PROVIDER_DATA.artistInfo,
  seriesSlugByArtworkSlug: {},
  archiveMedianAreaMm2: TIER_FALLBACK_AREA_MM2.md,
}

export const EMPTY_COLLECTION_LAYOUT_DATA: CollectionLayoutData = {
  artworks: [],
  filterSeries: [],
  timelineMarkers: EMPTY_LAYOUT_PROVIDER_DATA.timelineMarkers,
}

function relationId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' && Number.isFinite(id)) return id
  }
  return null
}

function parseYear(value: string | null | undefined): number | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  const yearPrefix = trimmed.match(/^(\d{4})/)
  if (yearPrefix) return Number(yearPrefix[1])
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) return parsed.getUTCFullYear()
  return null
}

function mapTimelineMarkers(person: Artist | null): TimelineMarkersData {
  if (!person) {
    return { bioEntries: [], throughlines: [], historicalReadings: [] }
  }

  const bioEntries = (person.bioTimelineEntries ?? [])
    .filter((entry) => (entry.visibility ?? 'public') === 'public' && Boolean(entry.text?.trim()))
    .map((entry) => {
      const eventDate = entry.eventDate?.trim() ?? ''
      const linkedArtworkIds = (entry.linkedArtworkSlugs ?? [])
        .map((value) => relationId(value))
        .filter((id): id is number => id !== null)
      return {
        id: entry.id ?? `${entry.text}-${eventDate}`,
        eventDate,
        year: parseYear(eventDate),
        text: entry.text?.trim() ?? '',
        permalinkHref: entry.slug?.trim() ? `/bio/entries/${entry.slug.trim()}` : null,
        sourceSessionHref: null,
        linkedArtworkIds,
      }
    })

  const throughlines = (person.statementThroughlines ?? [])
    .filter((entry) => (entry.visibility ?? 'public') === 'public' && Boolean(entry.text?.trim()))
    .map((entry) => {
      const linkedArtworkIds = (entry.linkedArtworkSlugs ?? [])
        .map((value) => relationId(value))
        .filter((id): id is number => id !== null)
      return {
        id: entry.id ?? entry.text,
        text: entry.text?.trim() ?? '',
        permalinkHref: entry.slug?.trim() ? `/statement/throughlines/${entry.slug.trim()}` : null,
        linkedArtworkIds,
      }
    })

  const historicalReadings = [
    ...(person.historicalBios ?? []).map((entry) => ({
      id: entry.id ?? `bio-${entry.date ?? 'undated'}`,
      date: entry.date ?? '',
      year: parseYear(entry.date ?? null),
      type: 'bio' as const,
      href: entry.id ? `/bio/history/${entry.id}` : '/bio',
    })),
    ...(person.historicalStatements ?? []).map((entry) => ({
      id: entry.id ?? `statement-${entry.date ?? 'undated'}`,
      date: entry.date ?? '',
      year: parseYear(entry.date ?? null),
      type: 'statement' as const,
      href: entry.id ? `/statement/history/${entry.id}` : '/statement',
    })),
  ].filter((entry) => Boolean(entry.id))

  return {
    bioEntries,
    throughlines,
    historicalReadings,
  }
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
    const timelineMarkers = mapTimelineMarkers(person)

    return {
      artworks,
      person,
      artistInfo: mapArtistToInfoData(person),
      timelineMarkers,
      filterSeries,
      seriesSlugByArtworkSlug: buildSeriesSlugByArtworkSlug(artworks),
      archiveMedianAreaMm2: computeArchiveMedianAreaMm2(artworks),
    }
  })
}

/**
 * Single-connection fetch (avoids parallel getPayload pool exhaustion).
 * React `cache` dedupes root layout + collection page reads in the same request.
 */
export const getLayoutProviderData = cache(async (): Promise<LayoutProviderData> => {
  try {
    return await fetchLayoutProviderData()
  } catch (err) {
    console.error('[layout-provider-data] falling back to empty data', err)
    return { ...EMPTY_LAYOUT_PROVIDER_DATA }
  }
})

/** Root layout: artist + slim map + scale anchor only (no catalogue rows to the client). */
export const getRootChromeData = cache(async (): Promise<RootChromeData> => {
  const data = await getLayoutProviderData()
  return {
    artistInfo: data.artistInfo,
    seriesSlugByArtworkSlug: data.seriesSlugByArtworkSlug,
    archiveMedianAreaMm2: data.archiveMedianAreaMm2,
  }
})

/** `/` and series pages: full catalogue + filter chips + timeline markers. */
export const getCollectionLayoutData = cache(async (): Promise<CollectionLayoutData> => {
  const data = await getLayoutProviderData()
  return {
    artworks: data.artworks,
    filterSeries: data.filterSeries,
    timelineMarkers: data.timelineMarkers,
  }
})

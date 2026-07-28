import { getPayload } from 'payload'
import config from '@payload-config'

import { mapArtistToInfoData } from '@/helpers/mapArtistInfo'
import {
  fetchCatalogueArtworksWithPayload,
  type LayoutProviderArtworks,
} from '@/lib/payload/artworks'
import { fetchFilterSeriesWithPayload } from '@/lib/payload/series'
import { withDbRetry } from '@/lib/payload/withDbRetry'
import type { ArtistInfoData, FilterCategory, TimelineMarkersData } from '@/types/frontend'
import type { Artist } from '@/payload-types'

export type LayoutProviderData = {
  artworks: LayoutProviderArtworks
  person: Artist | null
  artistInfo: ArtistInfoData
  timelineMarkers: TimelineMarkersData
  filterSeries: FilterCategory[]
}

export const EMPTY_LAYOUT_PROVIDER_DATA: LayoutProviderData = {
  artworks: [],
  person: null,
  artistInfo: mapArtistToInfoData(null),
  timelineMarkers: { bioEntries: [], throughlines: [], historicalReadings: [] },
  filterSeries: [],
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

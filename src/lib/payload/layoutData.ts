import { cache } from 'react'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

import { computeArchiveMedianAreaMm2 } from '@/lib/artwork/archiveMedianArea'
import {
  deriveReasoningStatus,
  indexSessionEvidence,
  primarySessionsForArtwork,
} from '@/lib/artwork/deriveReasoningStatus'
import {
  fetchCompletedSessionEvidence,
  sessionDatesByArtworkIdFromEvidence,
} from '@/lib/artwork/fetchSessionEvidence'
import { buildSeriesSlugByArtworkSlug } from '@/lib/artwork/seriesSlugMap'
import { mapArtistToInfoData } from '@/helpers/mapArtistInfo'
import {
  fetchCatalogueArtworksWithPayload,
  type LayoutProviderArtworks,
} from '@/lib/payload/artworks'
import { fetchFilterSeriesWithPayload } from '@/lib/payload/series'
import { getPerson } from '@/lib/payload/person'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import { withDbRetry } from '@/lib/payload/withDbRetry'
import {
  catalogueSnapshotMode,
  readDevCatalogueSnapshot,
  writeDevCatalogueSnapshot,
} from '@/lib/payload/devCatalogueSnapshot'
import type { ArtistInfoData, FilterCategory, TimelineMarkersData } from '@/types/frontend'
import type { Artist } from '@/payload-types'
/** Same value as `TIER_FALLBACK_AREA_MM2.md` — keep this file off `gridRealSize` so caption edits do not HMR-bust the catalogue cache. */
const FALLBACK_MEDIAN_AREA_MM2 = 500_000

export type LayoutProviderData = {
  artworks: LayoutProviderArtworks
  person: Artist | null
  artistInfo: ArtistInfoData
  timelineMarkers: TimelineMarkersData
  filterSeries: FilterCategory[]
  seriesSlugByArtworkSlug: Record<string, string>
  archiveMedianAreaMm2: number
  cataloguedCount: number
  /** Completed primary-session timestamps, keyed by artwork id. */
  sessionDatesByArtworkId: Record<number, string[]>
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
  timelineMarkers: TimelineMarkersData
  cataloguedCount: number
  sessionDatesByArtworkId: Record<number, string[]>
}

export const EMPTY_LAYOUT_PROVIDER_DATA: LayoutProviderData = {
  artworks: [],
  person: null,
  artistInfo: mapArtistToInfoData(null),
  timelineMarkers: { bioEntries: [], throughlines: [], historicalReadings: [] },
  filterSeries: [],
  seriesSlugByArtworkSlug: {},
  archiveMedianAreaMm2: FALLBACK_MEDIAN_AREA_MM2,
  cataloguedCount: 0,
  sessionDatesByArtworkId: {},
}

export const EMPTY_ROOT_CHROME_DATA: RootChromeData = {
  person: null,
  artistInfo: EMPTY_LAYOUT_PROVIDER_DATA.artistInfo,
  seriesSlugByArtworkSlug: {},
  archiveMedianAreaMm2: FALLBACK_MEDIAN_AREA_MM2,
}

export const EMPTY_COLLECTION_LAYOUT_DATA: CollectionLayoutData = {
  artworks: [],
  filterSeries: [],
  timelineMarkers: EMPTY_LAYOUT_PROVIDER_DATA.timelineMarkers,
  cataloguedCount: 0,
  sessionDatesByArtworkId: {},
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
        shortTitle: entry.shortTitle?.replace(/\s+/g, ' ').trim() || null,
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
        shortTitle: entry.shortTitle?.replace(/\s+/g, ' ').trim() || null,
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

/**
 * Derived catalogued count — completed primary session with messages > 0
 * plus a why-field. Never reads the stored reasoningStatus column.
 */
async function fetchDerivedCataloguedCount(
  payload: Payload,
  sessionIndex: ReturnType<typeof indexSessionEvidence>,
): Promise<number> {
  let count = 0
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'artworks',
      where: { status: { equals: 'published' } },
      limit: 100,
      page,
      depth: 0,
      overrideAccess: false,
      select: {
        id: true,
        slug: true,
        intent: true,
        formalContributionAssessment: true,
        descriptionShort: true,
        workContext: true,
      },
    })

    for (const doc of result.docs) {
      const slug = doc.slug?.trim() || ''
      if (!isPublicCatalogueSlug(slug)) continue
      const primary = primarySessionsForArtwork({ id: doc.id, slug }, sessionIndex)
      const derived = deriveReasoningStatus(doc, primary)
      if (derived.status === 'complete') count += 1
    }

    hasNextPage = result.hasNextPage
    page += 1
  }

  return count
}

async function fetchLayoutProviderData(): Promise<LayoutProviderData> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })

    const [artworks, artistResult, filterSeries, sessionEvidence] = await Promise.all([
      fetchCatalogueArtworksWithPayload(payload),
      payload.find({
        collection: 'artists',
        limit: 1,
        depth: 0,
        overrideAccess: false,
      }),
      fetchFilterSeriesWithPayload(payload),
      fetchCompletedSessionEvidence(payload).catch((err) => {
        console.error('[layout-provider-data] session evidence unavailable', err)
        return []
      }),
    ])

    const sessionIndex = indexSessionEvidence(sessionEvidence)
    // Dates only for sessions with messages > 0 — ghost shells are not cataloguing events.
    const sessionDatesResult = sessionDatesByArtworkIdFromEvidence(sessionEvidence)
    const cataloguedCount = await fetchDerivedCataloguedCount(payload, sessionIndex)

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
      cataloguedCount,
      sessionDatesByArtworkId: sessionDatesResult,
    }
  })
}

/** Hit Payload and rewrite `.cache/catalogue-layout.json`. */
export async function refreshDevCatalogueSnapshotFromPayload(): Promise<number> {
  const data = await fetchLayoutProviderData()
  await writeDevCatalogueSnapshot(data)
  return data.artworks.length
}

const DEV_CATALOGUE_TTL_MS = 5 * 60_000
const DEV_CATALOGUE_STORE_KEY = '__bernardbolterDevCatalogue' as const

type DevCatalogueStore = {
  inflight: Promise<LayoutProviderData> | null
  cache: { at: number; data: LayoutProviderData } | null
}

function getDevCatalogueStore(): DevCatalogueStore {
  const globalWithStore = globalThis as typeof globalThis & {
    [DEV_CATALOGUE_STORE_KEY]?: DevCatalogueStore
  }
  if (!globalWithStore[DEV_CATALOGUE_STORE_KEY]) {
    globalWithStore[DEV_CATALOGUE_STORE_KEY] = { inflight: null, cache: null }
  }
  return globalWithStore[DEV_CATALOGUE_STORE_KEY]
}

async function fetchLayoutProviderDataCached(): Promise<LayoutProviderData> {
  if (process.env.NODE_ENV !== 'development') {
    return fetchLayoutProviderData()
  }

  const store = getDevCatalogueStore()
  if (store.cache && Date.now() - store.cache.at < DEV_CATALOGUE_TTL_MS) {
    return store.cache.data
  }
  if (store.inflight) return store.inflight

  const mode = catalogueSnapshotMode()
  if (mode === 'use') {
    const snapshot = await readDevCatalogueSnapshot()
    if (snapshot) {
      console.info(`[layout-provider-data] snapshot (${snapshot.artworks.length} works)`)
      store.cache = { at: Date.now(), data: snapshot }
      return snapshot
    }
  }

  console.info('[layout-provider-data] catalogue fetch (Payload)')
  store.inflight = fetchLayoutProviderData()
    .then(async (data) => {
      if (data.artworks.length > 0) {
        store.cache = { at: Date.now(), data }
        if (mode !== 'off') {
          await writeDevCatalogueSnapshot(data)
          console.info('[layout-provider-data] snapshot written')
        }
      }
      return data
    })
    .finally(() => {
      store.inflight = null
    })

  return store.inflight
}

/**
 * React `cache` dedupes root layout + collection page reads in the same request.
 * In local dev, a disk snapshot of the last successful Payload catalogue is the
 * default source so HMR / Firefox refreshes do not re-query Neon through SSH.
 * `CATALOGUE_SNAPSHOT=refresh` rewrites it; `=live` always hits Payload.
 */
export const getLayoutProviderData = cache(async (): Promise<LayoutProviderData> => {
  try {
    return await fetchLayoutProviderDataCached()
  } catch (err) {
    console.error('[layout-provider-data] falling back to empty data', err)
    return { ...EMPTY_LAYOUT_PROVIDER_DATA }
  }
})

/** Root layout: artist only — do not wait on the 220-row catalogue. */
export const getRootChromeData = cache(async (): Promise<RootChromeData> => {
  try {
    if (catalogueSnapshotMode() === 'use') {
      const snapshot = await readDevCatalogueSnapshot()
      if (snapshot?.person || snapshot?.artistInfo) {
        return {
          person: snapshot.person,
          artistInfo: snapshot.artistInfo,
          seriesSlugByArtworkSlug: snapshot.seriesSlugByArtworkSlug,
          archiveMedianAreaMm2: snapshot.archiveMedianAreaMm2,
        }
      }
    }
    const person = await getPerson()
    return {
      person,
      artistInfo: mapArtistToInfoData(person),
      seriesSlugByArtworkSlug: {},
      archiveMedianAreaMm2: FALLBACK_MEDIAN_AREA_MM2,
    }
  } catch (err) {
    console.error('[root-chrome] falling back to empty data', err)
    return { ...EMPTY_ROOT_CHROME_DATA }
  }
})

/** `/` and series pages: full catalogue + filter chips + timeline markers. */
export const getCollectionLayoutData = cache(async (): Promise<CollectionLayoutData> => {
  const data = await getLayoutProviderData()
  return {
    artworks: data.artworks,
    filterSeries: data.filterSeries,
    timelineMarkers: data.timelineMarkers,
    cataloguedCount: data.cataloguedCount,
    sessionDatesByArtworkId: data.sessionDatesByArtworkId,
  }
})

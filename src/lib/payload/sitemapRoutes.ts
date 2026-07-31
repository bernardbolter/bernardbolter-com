import { getPayload } from 'payload'
import config from '@payload-config'
import type { Where } from 'payload'

import { withDbRetry } from '@/lib/payload/withDbRetry'
import { shouldUseDbUnavailableFallback } from '@/lib/payload/buildSafeDb'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import type { Artwork, Event, Series } from '@/payload-types'

export function isPublicSitemapSlug(slug: string | null | undefined): boolean {
  return isPublicCatalogueSlug(slug)
}

export type SitemapBioEntry = {
  slug: string
  /** Best available stamp — artist document `updatedAt` (entries have no own timestamp). */
  lastModified: string | null
}

export type SitemapThroughline = {
  slug: string
  lastModified: string | null
}

export type SitemapSession = {
  sessionId: string
  updatedAt: string
}

export type SitemapArtwork = Pick<
  Artwork,
  'slug' | 'updatedAt' | 'seriesSlug' | 'visionAnalyses'
>

export type SitemapEntries = {
  artworks: SitemapArtwork[]
  series: Series[]
  events: Event[]
  sessions: SitemapSession[]
  bioEntries: SitemapBioEntry[]
  throughlines: SitemapThroughline[]
}

const PAGE_SIZE = 100

const EMPTY: SitemapEntries = {
  artworks: [],
  series: [],
  events: [],
  sessions: [],
  bioEntries: [],
  throughlines: [],
}

async function paginatePublished<T extends { slug?: string | null }>(
  collection: 'artworks' | 'series' | 'events',
  where: Where,
  select?: Record<string, true>,
): Promise<T[]> {
  const payload = await getPayload({ config })
  const docs: T[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection,
      where,
      limit: PAGE_SIZE,
      page,
      depth: 0,
      overrideAccess: true,
      ...(select ? { select } : {}),
    })
    for (const doc of result.docs) {
      if (isPublicCatalogueSlug(doc.slug)) {
        docs.push(doc as unknown as T)
      }
    }
    hasNextPage = result.hasNextPage
    page += 1
  }

  return docs
}

async function paginateCompletedSessions(): Promise<SitemapSession[]> {
  const payload = await getPayload({ config })
  const docs: SitemapSession[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'sessions',
      where: { status: { equals: 'completed' } },
      limit: PAGE_SIZE,
      page,
      depth: 0,
      overrideAccess: true,
      select: {
        sessionId: true,
        updatedAt: true,
        status: true,
      },
    })
    for (const doc of result.docs) {
      const sessionId = doc.sessionId?.trim()
      if (!sessionId || doc.status !== 'completed') continue
      docs.push({
        sessionId,
        updatedAt: doc.updatedAt,
      })
    }
    hasNextPage = result.hasNextPage
    page += 1
  }

  return docs
}

async function fetchArtistPublicEntries(): Promise<{
  bioEntries: SitemapBioEntry[]
  throughlines: SitemapThroughline[]
}> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    select: {
      updatedAt: true,
      bioTimelineEntries: true,
      statementThroughlines: true,
    },
  })
  const artist = result.docs[0]
  if (!artist) return { bioEntries: [], throughlines: [] }

  const lastModified = artist.updatedAt ?? null

  const bioEntries: SitemapBioEntry[] = (artist.bioTimelineEntries ?? [])
    .filter((entry) => (entry.visibility ?? 'public') === 'public' && Boolean(entry.slug?.trim()))
    .map((entry) => ({
      slug: entry.slug!.trim(),
      lastModified,
    }))

  const throughlines: SitemapThroughline[] = (artist.statementThroughlines ?? [])
    .filter((entry) => (entry.visibility ?? 'public') === 'public' && Boolean(entry.slug?.trim()))
    .map((entry) => ({
      slug: entry.slug!.trim(),
      lastModified,
    }))

  return { bioEntries, throughlines }
}

export async function fetchSitemapEntries(): Promise<SitemapEntries> {
  try {
    return await withDbRetry(async () => {
      const [artworks, series, events, sessions, artistEntries] = await Promise.all([
        paginatePublished<SitemapArtwork>(
          'artworks',
          { status: { equals: 'published' } },
          {
            slug: true,
            updatedAt: true,
            seriesSlug: true,
            visionAnalyses: true,
          },
        ),
        paginatePublished<Series>('series', { status: { equals: 'published' } }),
        paginatePublished<Event>('events', {
          and: [{ status: { equals: 'published' } }, { hasPage: { equals: true } }],
        }),
        paginateCompletedSessions(),
        fetchArtistPublicEntries(),
      ])

      return {
        artworks,
        series,
        events,
        sessions,
        bioEntries: artistEntries.bioEntries,
        throughlines: artistEntries.throughlines,
      }
    })
  } catch (err) {
    if (shouldUseDbUnavailableFallback(err)) {
      return { ...EMPTY }
    }
    throw err
  }
}

/** Latest vision analysis `date`, or null. */
export function latestVisionAnalysisDate(
  artwork: Pick<SitemapArtwork, 'visionAnalyses'>,
): Date | null {
  const times = (artwork.visionAnalyses ?? [])
    .map((row) => row?.date)
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time))
  if (times.length === 0) return null
  return new Date(Math.max(...times))
}

/** Vision page lastmod: later of latest analysis date and artwork updatedAt. */
export function visionPageLastModified(
  artwork: Pick<SitemapArtwork, 'updatedAt' | 'visionAnalyses'>,
): Date | undefined {
  const visionDate = latestVisionAnalysisDate(artwork)
  const artworkDate = artwork.updatedAt ? new Date(artwork.updatedAt) : null
  if (visionDate && artworkDate) {
    return visionDate > artworkDate ? visionDate : artworkDate
  }
  return visionDate ?? artworkDate ?? undefined
}

export function artworkHasVisionAnalysis(
  artwork: Pick<SitemapArtwork, 'visionAnalyses'>,
): boolean {
  return (artwork.visionAnalyses ?? []).some((row) => Boolean(row?.text?.trim()))
}

/**
 * Series lastmod = most recent `updatedAt` among published artworks in that series.
 * Falls back to the series document stamp when no works match.
 */
export function seriesLastModified(
  seriesSlug: string,
  artworks: SitemapArtwork[],
  seriesUpdatedAt: string | null | undefined,
): Date | undefined {
  let latest: number | null = null
  for (const artwork of artworks) {
    if (artwork.seriesSlug?.trim() !== seriesSlug) continue
    if (!artwork.updatedAt) continue
    const time = new Date(artwork.updatedAt).getTime()
    if (!Number.isFinite(time)) continue
    if (latest == null || time > latest) latest = time
  }
  if (latest != null) return new Date(latest)
  return seriesUpdatedAt ? new Date(seriesUpdatedAt) : undefined
}

/** @deprecated Use fetchSitemapEntries */
export async function getSitemapArtworks(): Promise<Artwork[]> {
  return (await fetchSitemapEntries()).artworks as Artwork[]
}

/** @deprecated Use fetchSitemapEntries */
export async function getSitemapSeries(): Promise<Series[]> {
  return (await fetchSitemapEntries()).series
}

/** @deprecated Use fetchSitemapEntries */
export async function getSitemapEvents(): Promise<Event[]> {
  return (await fetchSitemapEntries()).events
}

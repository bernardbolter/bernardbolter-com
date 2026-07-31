import type { MetadataRoute } from 'next'

import { getSiteBaseUrl } from '@/lib/jsonld/site'
import {
  artworkHasVisionAnalysis,
  fetchSitemapEntries,
  seriesLastModified,
  visionPageLastModified,
} from '@/lib/payload/sitemapRoutes'

export const revalidate = 3600
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl().replace(/\/$/, '')
  const { artworks, series, events, sessions, bioEntries, throughlines } =
    await fetchSitemapEntries()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, priority: 1.0, changeFrequency: 'weekly' },
    { url: `${baseUrl}/bio`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${baseUrl}/cv`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${baseUrl}/statement`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${baseUrl}/contact`, priority: 0.6, changeFrequency: 'yearly' },
  ]

  const artworkRoutes: MetadataRoute.Sitemap = artworks.map((artwork) => ({
    url: `${baseUrl}/${artwork.slug}`,
    lastModified: artwork.updatedAt ? new Date(artwork.updatedAt) : undefined,
    priority: 0.9,
    changeFrequency: 'weekly',
  }))

  const recordRoutes: MetadataRoute.Sitemap = artworks.map((artwork) => ({
    url: `${baseUrl}/${artwork.slug}/record`,
    lastModified: artwork.updatedAt ? new Date(artwork.updatedAt) : undefined,
    priority: 0.5,
    changeFrequency: 'monthly',
  }))

  const visionRoutes: MetadataRoute.Sitemap = artworks
    .filter(artworkHasVisionAnalysis)
    .map((artwork) => ({
      url: `${baseUrl}/${artwork.slug}/vision`,
      lastModified: visionPageLastModified(artwork),
      priority: 0.5,
      changeFrequency: 'monthly',
    }))

  const seriesRoutes: MetadataRoute.Sitemap = series.map((entry) => {
    const slug = entry.slug?.trim() || ''
    return {
      url: `${baseUrl}/series/${slug}`,
      lastModified: seriesLastModified(slug, artworks, entry.updatedAt),
      priority: 0.7,
      changeFrequency: 'monthly' as const,
    }
  })

  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${baseUrl}/events/${event.slug}`,
    lastModified: event.updatedAt ? new Date(event.updatedAt) : undefined,
    priority: 0.6,
    changeFrequency: 'yearly',
  }))

  const sessionRoutes: MetadataRoute.Sitemap = sessions.map((session) => ({
    url: `${baseUrl}/sessions/${session.sessionId}`,
    lastModified: new Date(session.updatedAt),
    priority: 0.4,
    changeFrequency: 'yearly' as const,
  }))

  const bioEntryRoutes: MetadataRoute.Sitemap = bioEntries.map((entry) => ({
    url: `${baseUrl}/bio/entries/${entry.slug}`,
    lastModified: entry.lastModified ? new Date(entry.lastModified) : undefined,
    priority: 0.5,
    changeFrequency: 'monthly' as const,
  }))

  const throughlineRoutes: MetadataRoute.Sitemap = throughlines.map((entry) => ({
    url: `${baseUrl}/statement/throughlines/${entry.slug}`,
    lastModified: entry.lastModified ? new Date(entry.lastModified) : undefined,
    priority: 0.5,
    changeFrequency: 'monthly' as const,
  }))

  /** Experiment — JSON index as a single loc for search-mediated agent fetch permission. */
  const corpusIndexRoute: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/api/corpus/index`,
      changeFrequency: 'daily',
      priority: 0.3,
    },
  ]

  return [
    ...staticRoutes,
    ...artworkRoutes,
    ...recordRoutes,
    ...visionRoutes,
    ...seriesRoutes,
    ...eventRoutes,
    ...sessionRoutes,
    ...bioEntryRoutes,
    ...throughlineRoutes,
    ...corpusIndexRoute,
  ]
}

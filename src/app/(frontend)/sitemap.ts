import type { MetadataRoute } from 'next'

import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { fetchSitemapEntries } from '@/lib/payload/sitemapRoutes'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl()
  const { artworks, series, events } = await fetchSitemapEntries()

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
    changeFrequency: 'monthly',
  }))

  const seriesRoutes: MetadataRoute.Sitemap = series.map((entry) => ({
    url: `${baseUrl}/series/${entry.slug}`,
    lastModified: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
    priority: 0.7,
    changeFrequency: 'monthly',
  }))

  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${baseUrl}/events/${event.slug}`,
    lastModified: event.updatedAt ? new Date(event.updatedAt) : undefined,
    priority: 0.6,
    changeFrequency: 'yearly',
  }))

  return [...staticRoutes, ...artworkRoutes, ...seriesRoutes, ...eventRoutes]
}

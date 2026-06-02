import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'

import { getDisplayImageUrl } from '@/helpers/artworkCatalog'
import { getSiteBaseUrl } from '@/lib/jsonld/site'

export const revalidate = 3600

function toAbsoluteUrl(baseUrl: string, pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }
  return `${baseUrl}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/bio`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/cv`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/statement`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${baseUrl}/datenschutz`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
  ]

  const payload = await getPayload({ config })
  const { docs: artworks } = await payload.find({
    collection: 'artworks',
    where: { status: { equals: 'published' } },
    limit: 500,
    depth: 2,
    sort: '-updatedAt',
    overrideAccess: false,
  })

  const artworkRoutes: MetadataRoute.Sitemap = artworks.map((artwork) => {
    const imageUrl = getDisplayImageUrl(artwork)
    const images = imageUrl ? [toAbsoluteUrl(baseUrl, imageUrl)] : undefined
    const lastModified = artwork.updatedAt ? new Date(artwork.updatedAt) : now

    return {
      url: `${baseUrl}/${artwork.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
      images,
    }
  })

  return [...staticRoutes, ...artworkRoutes]
}

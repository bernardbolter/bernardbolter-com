import type { MetadataRoute } from 'next'

import { getSiteBaseUrl } from '@/lib/jsonld/site'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/studio/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

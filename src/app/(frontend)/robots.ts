import type { MetadataRoute } from 'next'

import { getSiteBaseUrl } from '@/lib/jsonld/site'

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === 'production'
  const baseUrl = getSiteBaseUrl()

  if (isProduction) {
    return {
      rules: [
        { userAgent: '*', allow: '/' },
        { userAgent: 'GPTBot', allow: '/' },
        { userAgent: 'Google-Extended', allow: '/' },
        { userAgent: 'anthropic-ai', allow: '/' },
        { userAgent: 'CCBot', allow: '/' },
        { userAgent: 'PerplexityBot', allow: '/' },
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
    }
  }

  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}

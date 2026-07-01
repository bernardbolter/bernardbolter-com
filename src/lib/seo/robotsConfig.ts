import type { MetadataRoute } from 'next'

import { getSiteBaseUrl } from '@/lib/jsonld/site'

export function getRobotsConfig(): MetadataRoute.Robots {
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

export function robotsConfigToText(config: MetadataRoute.Robots): string {
  const lines: string[] = []
  const rules = Array.isArray(config.rules) ? config.rules : [config.rules]

  for (const rule of rules) {
    if (!rule) continue
    lines.push(`User-agent: ${rule.userAgent ?? '*'}`)

    if (rule.allow) {
      const allows = Array.isArray(rule.allow) ? rule.allow : [rule.allow]
      for (const path of allows) {
        lines.push(`Allow: ${path}`)
      }
    }

    if (rule.disallow) {
      const disallows = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]
      for (const path of disallows) {
        lines.push(`Disallow: ${path}`)
      }
    }

    lines.push('')
  }

  if (config.sitemap) {
    const sitemaps = Array.isArray(config.sitemap) ? config.sitemap : [config.sitemap]
    for (const sitemap of sitemaps) {
      lines.push(`Sitemap: ${sitemap}`)
    }
  }

  return `${lines.join('\n').trimEnd()}\n`
}

import type { MetadataRoute } from 'next'

import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { corpusIndexUrl } from '@/lib/seo/corpusDiscovery'

function isProductionRobotsHost(): boolean {
  const vercelEnv = process.env.VERCEL_ENV
  // Preview/dev deploys on Vercel must stay closed.
  if (vercelEnv === 'preview' || vercelEnv === 'development') return false
  if (vercelEnv === 'production') return true
  // Self-hosted production (Caddy, etc.) typically has no VERCEL_ENV.
  return process.env.NODE_ENV === 'production'
}

export function getRobotsConfig(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl()

  if (isProductionRobotsHost()) {
    return {
      rules: [
        { userAgent: '*', allow: '/' },
        { userAgent: 'GPTBot', allow: '/' },
        { userAgent: 'Google-Extended', allow: '/' },
        { userAgent: 'anthropic-ai', allow: '/' },
        { userAgent: 'ClaudeBot', allow: '/' },
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

  if (isProductionRobotsHost()) {
    lines.push(
      '# AI crawlers: preferred machine-readable entry point is',
      `# ${corpusIndexUrl()}`,
      '',
    )
  }

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

import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Override for safe deploys: build to a staging dir, swap only on success (scripts/deploy-netcup.sh).
  distDir: process.env.NEXT_DIST_DIR?.trim() || '.next',
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  /**
   * Caps ISR `stale-while-revalidate` (Next default is 31536000 ≈ 1 year).
   * Header math: stale-while-revalidate = expireTime − s-maxage.
   * Homepage s-maxage is 300 (shortest unstable_cache in the tree: getPerson),
   * so this yields stale-while-revalidate=3300 — not a year of CDN stale HTML.
   */
  expireTime: 3600,
  experimental: {
    // Studio field-note uploads are multipart POSTs (video clips can be large).
    proxyClientMaxBodySize: '500mb',
  },
  async redirects() {
    return [
      { source: '/artworks', destination: '/', permanent: true },
      { source: '/artworks/:slug', destination: '/:slug', permanent: true },
      { source: '/:slug/embedding', destination: '/:slug/vision', permanent: true },
      // Agents guess singular /session; canonical index is plural.
      { source: '/:slug/session', destination: '/:slug/sessions', permanent: true },
    ]
  },
  images: {
    // Never use Vercel Image Optimization (/_next/image) — serve direct R2/public URLs.
    unoptimized: true,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

/**
 * Payload's withPayload injects Accept-CH + Critical-CH: Sec-CH-Prefers-Color-Scheme
 * on every path for admin theme SSR. Critical-CH forces browsers to 307-retry the
 * same URL on first navigation (~200–1000ms) before painting. Frontend theme is
 * CSS-only (prefers-color-scheme); admin theme still resolves via cookie/default.
 * Strip those headers; keep X-Powered-By from withPayload.
 */
const payloadConfig = withPayload(nextConfig, { devBundleServerPackages: false })

const STRIP_HEADER_KEYS = new Set(['Accept-CH', 'Critical-CH'])

export default {
  ...payloadConfig,
  headers: async () => {
    const rules = (await payloadConfig.headers?.()) ?? []
    return rules
      .map((rule) => ({
        ...rule,
        headers: (rule.headers ?? []).filter((header) => {
          if (STRIP_HEADER_KEYS.has(header.key)) return false
          if (
            header.key === 'Vary' &&
            header.value === 'Sec-CH-Prefers-Color-Scheme'
          ) {
            return false
          }
          return true
        }),
      }))
      .filter((rule) => (rule.headers?.length ?? 0) > 0)
  },
} satisfies NextConfig

/** Single-segment paths reserved for site routes — must not be artwork slugs. */
export const RESERVED_FRONTEND_SLUGS = new Set([
  'admin',
  'api',
  'artworks',
  'bio',
  'contact',
  'cv',
  'datenschutz',
  'events',
  'preview',
  'robots.txt',
  'sitemap.xml',
  'statement',
  'studio',
])

export function isReservedFrontendSlug(slug: string | null | undefined): boolean {
  if (!slug) return false
  return RESERVED_FRONTEND_SLUGS.has(slug.toLowerCase())
}

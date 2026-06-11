const RESERVED_SINGLE_SEGMENT = new Set([
  'admin',
  'api',
  'artworks',
  'bio',
  'contact',
  'cv',
  'datenschutz',
  'events',
  'statement',
  'studio',
  'preview',
  'robots.txt',
  'sitemap.xml',
])

/** True for public artwork pages `/{slug}` and dev preview `/preview/artwork/{slug}`. */
export function isArtworkDetailPath(pathname: string): boolean {
  if (pathname.startsWith('/preview/artwork/')) return true

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 1) return false

  return !RESERVED_SINGLE_SEGMENT.has(segments[0].toLowerCase())
}

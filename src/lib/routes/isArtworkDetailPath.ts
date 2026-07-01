import { isReservedFrontendSlug } from '@/lib/routes/reservedFrontendSlugs'

/** True for public artwork pages `/{slug}` and dev preview `/preview/artwork/{slug}`. */
export function isArtworkDetailPath(pathname: string): boolean {
  if (pathname.startsWith('/preview/artwork/')) return true

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 1) return false

  return !isReservedFrontendSlug(segments[0])
}

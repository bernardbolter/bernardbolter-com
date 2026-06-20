import { isArtworkDetailPath } from '@/lib/routes/isArtworkDetailPath'

/** Slug for `/[slug]/embedding` paths, or null when not an embedding page. */
export function artworkSlugFromEmbeddingPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 2 || segments[1] !== 'embedding') return null
  return segments[0] ?? null
}

/** Resolves artwork slug from detail, preview, legacy, or embedding routes. */
export function artworkSlugFromPathname(pathname: string): string | null {
  if (pathname.startsWith('/preview/artwork/')) {
    return pathname.split('/').filter(Boolean)[2] ?? null
  }
  if (pathname.startsWith('/artworks/')) {
    return pathname.split('/').filter(Boolean)[1] ?? null
  }

  const embeddingSlug = artworkSlugFromEmbeddingPath(pathname)
  if (embeddingSlug) return embeddingSlug

  if (isArtworkDetailPath(pathname)) {
    return pathname.split('/').filter(Boolean)[0] ?? null
  }

  return null
}

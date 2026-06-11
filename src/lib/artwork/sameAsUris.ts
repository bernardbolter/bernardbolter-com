import type { Artwork } from '@/payload-types'

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Public sameAs URIs from artwork.sameAs and artwork.sameAsUrls. */
export function collectArtworkSameAsUris(artwork: Artwork): string[] {
  const uris = new Set<string>()
  for (const row of artwork.sameAsUrls ?? []) {
    const url = trimString(row.url)
    if (url) uris.add(url)
  }
  for (const row of artwork.sameAs ?? []) {
    const url = trimString(row.url)
    if (url) uris.add(url)
  }
  return [...uris]
}

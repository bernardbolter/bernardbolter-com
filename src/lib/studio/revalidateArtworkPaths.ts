import { revalidateArchive } from '@/lib/cache/revalidateArchive'

/** Bust ISR for artwork + vision pages after archive imports. */
export function revalidateArtworkPaths(slug: string): void {
  const trimmed = slug.trim()
  if (!trimmed) return

  const path = `/${trimmed}`
  revalidateArchive({ tags: ['artworks'], paths: ['/', path, `${path}/vision`] })
}

import { artworkPublicRevalidatePaths } from '@/lib/cache/artworkPublicRevalidatePaths'
import { revalidateArchive } from '@/lib/cache/revalidateArchive'
import { revalidateCorpusFeed } from '@/lib/cache/revalidateCorpusFeed'

/**
 * Bust Next ISR + Cloudflare for artwork HTML pages after Studio imports,
 * and always fire the dedicated corpus feed regeneration trigger.
 */
export function revalidateArtworkPaths(slug: string): void {
  const trimmed = slug.trim()
  revalidateArchive({
    tags: ['artworks'],
    paths: artworkPublicRevalidatePaths(trimmed).filter(
      // Corpus API paths are owned by revalidateCorpusFeed — keep this list page-oriented.
      (path) => !path.startsWith('/api/corpus'),
    ),
  })
  revalidateCorpusFeed({ artworkSlug: trimmed || undefined })
}

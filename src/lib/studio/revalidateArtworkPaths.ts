import { artworkPublicRevalidatePaths } from '@/lib/cache/artworkPublicRevalidatePaths'
import { revalidateArchive } from '@/lib/cache/revalidateArchive'

/**
 * Bust Next ISR + Cloudflare for artwork pages and corpus APIs after Studio imports.
 * Corpus refresh is on write — not a timer, not deploy-gated.
 * Artwork Payload afterChange uses the same path list.
 */
export function revalidateArtworkPaths(slug: string): void {
  revalidateArchive({
    tags: ['artworks', 'corpus'],
    paths: artworkPublicRevalidatePaths(slug),
  })
}

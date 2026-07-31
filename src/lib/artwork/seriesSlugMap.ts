import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import type { CatalogueArtwork } from '@/types/frontend'

/** Slim slug → seriesSlug map for menu accent colour without the full catalogue. */
export function buildSeriesSlugByArtworkSlug(
  artworks: CatalogueArtwork[],
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const artwork of artworks) {
    const slug = artwork.slug?.trim()
    if (!slug) continue
    const seriesSlug = resolveSeriesSlug(artwork)
    if (seriesSlug) map[slug] = seriesSlug
  }
  return map
}

import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import type { Artwork } from '@/payload-types'

/** Series accent for Info menu chrome on an artwork page. */
export function resolveArtworkMenuPlusColor(
  artwork: Pick<Artwork, 'series' | 'seriesSlug'>,
): string {
  return getSeriesColor(resolveSeriesSlug(artwork) ?? 'a-colorful-history')
}

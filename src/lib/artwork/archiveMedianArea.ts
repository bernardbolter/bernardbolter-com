import {
  getMedianArea,
  getRealAreaMm2,
  resolveArtworkArea,
  TIER_FALLBACK_AREA_MM2,
} from '@/lib/artwork/gridRealSize'
import type { CatalogueArtwork } from '@/types/frontend'

/**
 * Archive-wide median area (mm²) for physically-scaled grid packing.
 * Same precedence as buildGridItemLayouts historically used on the full set:
 * physical areas → resolveArtworkArea fallbacks → tier md constant.
 */
export function computeArchiveMedianAreaMm2(artworks: CatalogueArtwork[]): number {
  const physicalAreas = artworks
    .map(getRealAreaMm2)
    .filter((area): area is number => area !== null)

  const physicalMedian = getMedianArea(physicalAreas)
  if (physicalMedian > 0) return physicalMedian

  const resolvedMedian = getMedianArea(artworks.map((artwork) => resolveArtworkArea(artwork).areaMm2))
  if (resolvedMedian > 0) return resolvedMedian

  return TIER_FALLBACK_AREA_MM2.md
}

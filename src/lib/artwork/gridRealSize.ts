import { getPrimaryMediaDimensions, getSizeTier } from '@/helpers/artworkCatalog'
import type { ArtworkSizeTier, CatalogueArtwork } from '@/types/frontend'
import { normalizeOrientation, type ArtworkOrientation, normalizeSizeTier } from '@/utilities/artworkSizeDisplay'

/** Minimum whitespace on all four sides of every image within its column cell. */
export const CELL_PAD = 20

export const COMPRESSION = 0.25
export const MIN_SCALE = 0.55
export const MAX_SCALE = 0.95

export const LANDSCAPE_BOOST = 1.15
export const PORTRAIT_BOOST = 1.0
export const SQUARE_BOOST = 1.0

/**
 * Scales digital pixel area into a comparable mm² range for median calculation.
 * Tune once against real archive data.
 */
export const DIGITAL_AREA_SCALE_CONSTANT = 0.12

/** Emergency stand-in areas when no physical or digital proxy dimensions exist. */
export const TIER_FALLBACK_AREA_MM2: Record<ArtworkSizeTier, number> = {
  xs: 150_000,
  sm: 280_000,
  md: 500_000,
  lg: 900_000,
  xl: 1_800_000,
}

/** space-3 caption padding (8px) + single-line title row (~18px). */
export const GRID_CAPTION_BLOCK_HEIGHT_PX = 26

export type GridAreaResolution = {
  areaMm2: number
  usingFallbackSizing: boolean
}

export type GridDisplayDimensions = {
  displayWidth: number
  displayHeight: number
}

export type GridItemLayout = {
  artwork: CatalogueArtwork
  columnWidth: number
  displayWidth: number
  displayHeight: number
  scaleFactor: number
  contentHeight: number
  usingFallbackSizing: boolean
}

export function getRealAreaMm2(
  artwork: Pick<CatalogueArtwork, 'widthMm' | 'heightMm'>,
): number | null {
  const widthMm = artwork.widthMm
  const heightMm = artwork.heightMm
  if (typeof widthMm === 'number' && widthMm > 0 && typeof heightMm === 'number' && heightMm > 0) {
    return widthMm * heightMm
  }
  return null
}

function getDigitalProxyAreaMm2(
  artwork: Pick<CatalogueArtwork, 'widthPx' | 'heightPx'>,
): number | null {
  const widthPx = artwork.widthPx
  const heightPx = artwork.heightPx
  if (typeof widthPx === 'number' && widthPx > 0 && typeof heightPx === 'number' && heightPx > 0) {
    return widthPx * heightPx * DIGITAL_AREA_SCALE_CONSTANT
  }
  return null
}

function getTierFallbackAreaMm2(artwork: Pick<CatalogueArtwork, 'sizeTier'>): number {
  return TIER_FALLBACK_AREA_MM2[normalizeSizeTier(getSizeTier(artwork))]
}

export function resolveArtworkArea(artwork: CatalogueArtwork): GridAreaResolution {
  const physical = getRealAreaMm2(artwork)
  if (physical !== null) {
    return { areaMm2: physical, usingFallbackSizing: false }
  }

  const isDigital =
    Array.isArray(artwork.measurementType) && artwork.measurementType.includes('digital')
  if (isDigital) {
    const proxy = getDigitalProxyAreaMm2(artwork)
    if (proxy !== null) {
      return { areaMm2: proxy, usingFallbackSizing: false }
    }
  }

  return {
    areaMm2: getTierFallbackAreaMm2(artwork),
    usingFallbackSizing: true,
  }
}

export function getMedianArea(areasMm2: number[]): number {
  const areas = areasMm2.filter((area) => area > 0).sort((a, b) => a - b)
  if (areas.length === 0) return 0
  const mid = Math.floor(areas.length / 2)
  return areas.length % 2 !== 0 ? areas[mid] : (areas[mid - 1] + areas[mid]) / 2
}

export function getOrientationMultiplier(aspectRatio: number): number {
  if (aspectRatio > 1) return LANDSCAPE_BOOST
  if (aspectRatio < 1) return PORTRAIT_BOOST
  return SQUARE_BOOST
}

export function getScaleFactor(realArea: number, medianArea: number, aspectRatio: number): number {
  if (realArea <= 0 || medianArea <= 0) return 1
  const ratio = realArea / medianArea
  const raw = 1 + Math.log(ratio) * COMPRESSION
  const boosted = raw * getOrientationMultiplier(aspectRatio)
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, boosted))
}

export function reconcileAspectRatioWithOrientation(
  aspectRatio: number,
  orientation: ArtworkOrientation | null,
): number {
  if (aspectRatio <= 0) return 1
  if (orientation === 'landscape' && aspectRatio < 1) return 1 / aspectRatio
  if (orientation === 'portrait' && aspectRatio > 1) return 1 / aspectRatio
  if (orientation === 'square') return 1
  return aspectRatio
}

export function resolveArtworkAspectRatio(
  artwork: Pick<
    CatalogueArtwork,
    | 'aspectRatio'
    | 'widthMm'
    | 'heightMm'
    | 'widthPx'
    | 'heightPx'
    | 'primaryImage'
    | 'posterImage'
    | 'orientation'
  >,
): number {
  const orientation = normalizeOrientation(artwork.orientation)

  const { width: mediaWidth, height: mediaHeight } = getPrimaryMediaDimensions(artwork)
  if (mediaWidth > 1 && mediaHeight > 1) {
    return reconcileAspectRatioWithOrientation(mediaWidth / mediaHeight, orientation)
  }

  const widthPx = artwork.widthPx
  const heightPx = artwork.heightPx
  if (typeof widthPx === 'number' && widthPx > 0 && typeof heightPx === 'number' && heightPx > 0) {
    return reconcileAspectRatioWithOrientation(widthPx / heightPx, orientation)
  }

  const physical = getRealAreaMm2(artwork)
  if (physical !== null && artwork.widthMm && artwork.heightMm) {
    return reconcileAspectRatioWithOrientation(artwork.widthMm / artwork.heightMm, orientation)
  }

  if (typeof artwork.aspectRatio === 'number' && artwork.aspectRatio > 0) {
    return reconcileAspectRatioWithOrientation(artwork.aspectRatio, orientation)
  }

  return 1
}

export function getAvailableInteriorWidth(columnWidth: number): number {
  return Math.max(columnWidth - 2 * CELL_PAD, 1)
}

export function getDisplayDimensions(
  aspectRatio: number,
  columnWidth: number,
  scaleFactor: number,
): GridDisplayDimensions {
  const availableWidth = getAvailableInteriorWidth(columnWidth)
  const safeAspect = aspectRatio > 0 ? aspectRatio : 1
  const displayWidth = availableWidth * scaleFactor
  const displayHeight = displayWidth / safeAspect

  return {
    displayWidth: Math.max(Math.round(displayWidth), 1),
    displayHeight: Math.max(Math.round(displayHeight), 1),
  }
}

export function getGridItemContentHeight(displayHeight: number): number {
  return displayHeight + 2 * CELL_PAD + GRID_CAPTION_BLOCK_HEIGHT_PX
}

/**
 * Compute per-item display sizes for the current filtered set.
 * Median recalculates when the filtered set changes, not on sort or resize.
 */
export function buildGridItemLayouts(
  artworks: CatalogueArtwork[],
  columnWidth: number,
): GridItemLayout[] {
  const areaResolutions = artworks.map(resolveArtworkArea)
  const medianInputAreas = artworks
    .map(getRealAreaMm2)
    .filter((area): area is number => area !== null)
  const medianArea = getMedianArea(medianInputAreas)
  const safeMedian =
    medianArea > 0
      ? medianArea
      : getMedianArea(areaResolutions.map((entry) => entry.areaMm2)) || TIER_FALLBACK_AREA_MM2.md

  return artworks.map((artwork, index) => {
    const { areaMm2, usingFallbackSizing } = areaResolutions[index]
    const aspectRatio = resolveArtworkAspectRatio(artwork)
    const scaleFactor = getScaleFactor(areaMm2, safeMedian, aspectRatio)
    const { displayWidth, displayHeight } = getDisplayDimensions(aspectRatio, columnWidth, scaleFactor)

    return {
      artwork,
      columnWidth,
      displayWidth,
      displayHeight,
      scaleFactor,
      contentHeight: getGridItemContentHeight(displayHeight),
      usingFallbackSizing,
    }
  })
}

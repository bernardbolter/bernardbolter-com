import type { Artwork, Media } from '@/payload-types'
import type { ArtworkSizeTier } from '@/types/frontend'

const DEFAULT_SIZE_TIER: ArtworkSizeTier = 'lg'

export function resolveSeriesSlug(artwork: Pick<Artwork, 'seriesSlug' | 'series'>): string | null {
  if (artwork.seriesSlug?.trim()) return artwork.seriesSlug.trim()
  const series = artwork.series
  if (series && typeof series === 'object' && 'slug' in series && typeof series.slug === 'string') {
    return series.slug
  }
  return null
}

export function artworkHasDisplayImage(
  artwork: Pick<Artwork, 'primaryImage' | 'posterImage'>,
): boolean {
  return Boolean(getDisplayImageUrl(artwork))
}

export function getDisplayImageUrl(
  artwork: Pick<Artwork, 'primaryImage' | 'posterImage'>,
): string | null {
  const primary = artwork.primaryImage
  if (primary && typeof primary === 'object' && primary.url) {
    return String(primary.url)
  }
  const poster = artwork.posterImage
  if (poster && typeof poster === 'object' && poster.url) {
    return String(poster.url)
  }
  return null
}

export function getSizeTier(artwork: Pick<Artwork, 'sizeTier'>): ArtworkSizeTier {
  const tier = artwork.sizeTier
  if (tier === 'sm' || tier === 'md' || tier === 'lg' || tier === 'xl') {
    return tier
  }
  return DEFAULT_SIZE_TIER
}

export function getPrimaryMediaDimensions(
  artwork: Pick<Artwork, 'primaryImage' | 'posterImage' | 'widthPx' | 'heightPx'>,
): { width: number; height: number } {
  const fromMedia = readMediaDimensions(artwork.primaryImage) ?? readMediaDimensions(artwork.posterImage)
  if (fromMedia) return fromMedia

  const widthPx = artwork.widthPx ?? 0
  const heightPx = artwork.heightPx ?? 0
  if (widthPx > 0 && heightPx > 0) {
    return { width: widthPx, height: heightPx }
  }

  return { width: 1, height: 1 }
}

function readMediaDimensions(media: number | Media | null | undefined): { width: number; height: number } | null {
  if (!media || typeof media !== 'object') return null
  const width = media.width ?? 0
  const height = media.height ?? 0
  if (width > 0 && height > 0) {
    return { width, height }
  }
  return null
}

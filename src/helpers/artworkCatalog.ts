import type { Artwork, Media } from '@/payload-types'
import { SIZE_TIER_VALUES } from '@/lib/artOfficial/inferSizeTier'
import {
  getArtworkImageSources,
  getArtworkOriginalImageUrl,
  type ArtworkImageContext,
} from '@/lib/media/artworkR2Images'
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
  artwork: Pick<Artwork, 'primaryImage' | 'posterImage' | 'slug'>,
  context: ArtworkImageContext = 'grid',
): string | null {
  return getArtworkImageSources(artwork, context)?.src ?? null
}

export function getArtworkImageFallbackUrl(
  artwork: Pick<Artwork, 'primaryImage' | 'posterImage' | 'slug'>,
): string | null {
  return getArtworkOriginalImageUrl(artwork)
}

export function getArtworkImagePair(
  artwork: Pick<Artwork, 'primaryImage' | 'posterImage' | 'slug'>,
  context: ArtworkImageContext,
): { src: string; fallback: string } | null {
  return getArtworkImageSources(artwork, context)
}

export function getSizeTier(artwork: Pick<Artwork, 'sizeTier'>): ArtworkSizeTier {
  const tier = artwork.sizeTier
  if (tier && (SIZE_TIER_VALUES as readonly string[]).includes(tier)) {
    return tier as ArtworkSizeTier
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

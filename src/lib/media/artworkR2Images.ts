import type { Artwork, Media } from '@/payload-types'

import {
  publicUrlForObjectKey,
  stripMediaUrlVersion,
} from '@/lib/media/r2Object'

export type ArtworkImageContext =
  | 'grid'
  | 'timeline'
  | 'slideshow'
  | 'artwork-page'
  | 'vision-page'
  | 'similar-works'

export const ARTWORK_DERIVATIVE_SIZES = [
  { suffix: '400w', width: 400 },
  { suffix: '800w', width: 800 },
  { suffix: '1200w', width: 1200 },
] as const

export type ArtworkDerivativeSuffix = (typeof ARTWORK_DERIVATIVE_SIZES)[number]['suffix']

export type ArtworkImageSources = {
  src: string
  fallback: string
}

const CONTEXT_SUFFIX: Record<ArtworkImageContext, ArtworkDerivativeSuffix> = {
  grid: '400w',
  'similar-works': '400w',
  timeline: '800w',
  slideshow: '800w',
  'artwork-page': '800w',
  'vision-page': '1200w',
}

function readPrimaryMedia(
  artwork: Pick<Artwork, 'primaryImage' | 'posterImage'>,
): Media | null {
  const primary = artwork.primaryImage
  if (primary && typeof primary === 'object') return primary

  const poster = artwork.posterImage
  if (poster && typeof poster === 'object') return poster

  return null
}

/** Direct R2 original URL — spec `imageUrl` field equivalent (from `primaryImage.url`). */
export function getArtworkOriginalImageUrl(
  artwork: Pick<Artwork, 'primaryImage' | 'posterImage'>,
): string | null {
  const media = readPrimaryMedia(artwork)
  if (!media?.url?.trim()) return null
  return stripMediaUrlVersion(media.url.trim())
}

export function derivativeObjectKey(slug: string, suffix: ArtworkDerivativeSuffix): string {
  return `${slug.trim()}-${suffix}.jpg`
}

export function derivativePublicUrl(slug: string, suffix: ArtworkDerivativeSuffix): string {
  return publicUrlForObjectKey(derivativeObjectKey(slug, suffix))
}

export function getArtworkImageUrl(
  slug: string,
  context: ArtworkImageContext,
): string {
  return derivativePublicUrl(slug, CONTEXT_SUFFIX[context])
}

export function getArtworkImageSources(
  artwork: Pick<Artwork, 'primaryImage' | 'posterImage' | 'slug'>,
  context: ArtworkImageContext,
): ArtworkImageSources | null {
  const fallback = getArtworkOriginalImageUrl(artwork)
  if (!fallback) return null

  const slug = artwork.slug?.trim()
  if (!slug) {
    return { src: fallback, fallback }
  }

  return {
    src: getArtworkImageUrl(slug, context),
    fallback,
  }
}

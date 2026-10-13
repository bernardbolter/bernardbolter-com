import {
  publicUrlForObjectKey,
  stripMediaUrlVersion,
} from '@/lib/media/r2Object'

/** Minimal media shape for derivative URL resolution (full Media or catalogue slim). */
type ImageMediaLike = {
  url?: string | null
  width?: number | null
  height?: number | null
}

type ArtworkImageSource = {
  primaryImage?: (number | ImageMediaLike) | null
  posterImage?: (number | ImageMediaLike) | null
  slug?: string | null
}

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
  /** Default / fallback `src` — prefer the 1x derivative when a srcSet exists. */
  src: string
  /** Responsive candidates, e.g. `…-400w.jpg 400w, …-800w.jpg 800w`. */
  srcSet?: string
  fallback: string
}

const CONTEXT_SUFFIX: Record<ArtworkImageContext, ArtworkDerivativeSuffix> = {
  grid: '400w',
  'similar-works': '400w',
  // Timeline paints ~300–450 CSS px; 400w for 1x, 800w for 2x via srcSet.
  timeline: '400w',
  slideshow: '800w',
  'artwork-page': '800w',
  'vision-page': '1200w',
}

/** Contexts that expose 400w + 800w so the browser can pick by DPR / sizes. */
const RESPONSIVE_SRCSET_CONTEXTS = new Set<ArtworkImageContext>(['timeline'])

function readPrimaryMedia(artwork: ArtworkImageSource): ImageMediaLike | null {
  const primary = artwork.primaryImage
  if (primary && typeof primary === 'object') return primary

  const poster = artwork.posterImage
  if (poster && typeof poster === 'object') return poster

  return null
}

/** Direct R2 original URL — spec `imageUrl` field equivalent (from `primaryImage.url`). */
export function getArtworkOriginalImageUrl(artwork: ArtworkImageSource): string | null {
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
  artwork: ArtworkImageSource,
  context: ArtworkImageContext,
): ArtworkImageSources | null {
  const fallback = getArtworkOriginalImageUrl(artwork)
  if (!fallback) return null

  const slug = artwork.slug?.trim()
  if (!slug) {
    return { src: fallback, fallback }
  }

  const src = getArtworkImageUrl(slug, context)
  if (!RESPONSIVE_SRCSET_CONTEXTS.has(context)) {
    return { src, fallback }
  }

  const src400 = derivativePublicUrl(slug, '400w')
  const src800 = derivativePublicUrl(slug, '800w')
  // Use 1x/2x — not 400w/800w. A ~406 CSS-px slot makes 400/406 < 1, so
  // width descriptors skip 400w and fetch 800w even on 1x screens.
  return {
    src: src400,
    srcSet: `${src400} 1x, ${src800} 2x`,
    fallback,
  }
}

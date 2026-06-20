import type { Artwork } from '@/payload-types'

import { getSiteBaseUrl } from '@/lib/jsonld/site'

/** Whether an artwork should be typed as VideoObject in JSON-LD mention stubs. */
export function isVideoArtwork(artwork: Artwork): boolean {
  if (artwork.measurementType?.includes('time-based')) return true
  if (artwork.medium === 'video') return true
  if (artwork.videoFile || artwork.videoUrl) return true
  return Boolean(artwork.videos?.some((clip) => clip.videoFile || clip.videoUrl))
}

export function buildArtworkMentionStub(
  artwork: Artwork,
  baseUrl: string = getSiteBaseUrl(),
): Record<string, unknown> {
  return {
    '@type': isVideoArtwork(artwork) ? 'VideoObject' : 'VisualArtwork',
    name: artwork.title,
    url: `${baseUrl}/${artwork.slug}`,
  }
}

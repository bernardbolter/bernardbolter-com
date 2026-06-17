import type { Media } from '@/payload-types'

type MediaUrlSource = Pick<Media, 'url' | 'updatedAt' | 'filename'>

/** Public CDN URL with a version query so browsers and Next/Image pick up file replacements. */
export function mediaPublicUrl(media: MediaUrlSource | null | undefined): string | null {
  if (!media?.url) return null

  const base = String(media.url)
  const version = media.updatedAt || media.filename
  if (!version) return base

  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}v=${encodeURIComponent(version)}`
}

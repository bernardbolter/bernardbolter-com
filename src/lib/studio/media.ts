import type { Media } from '@/payload-types'

export function resolveMediaUrl(media: Media | number | null | undefined): string | null {
  if (!media || typeof media === 'number') return null
  if (media.url) return media.url
  const domain = process.env.NEXT_PUBLIC_IMAGE_DOMAIN?.replace(/\/$/, '')
  if (domain && media.filename) return `${domain}/${media.filename}`
  return null
}

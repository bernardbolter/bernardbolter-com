import type { Media } from '@/payload-types'

import {
  FIELDNOTE_LOCAL_URL_PREFIX,
  INBOX_PREFIX,
  studioLocalMediaApiPath,
} from '@/lib/studio/fieldNoteLocalPaths'

export function resolveMediaUrl(media: Media | number | null | undefined): string | null {
  if (!media || typeof media === 'number') return null

  if (media.url?.startsWith(FIELDNOTE_LOCAL_URL_PREFIX)) {
    return studioLocalMediaApiPath(media.url.slice(FIELDNOTE_LOCAL_URL_PREFIX.length))
  }
  if (media.filename?.startsWith(INBOX_PREFIX)) {
    return studioLocalMediaApiPath(media.filename)
  }

  if (media.url) return media.url
  const domain = process.env.NEXT_PUBLIC_IMAGE_DOMAIN?.replace(/\/$/, '')
  if (domain && media.filename) return `${domain}/${media.filename}`
  return null
}

/** Client-safe path/url helpers for local field-note media (no Node built-ins). */

export const FIELDNOTE_LOCAL_URL_PREFIX = 'fieldnote-local:'
export const INBOX_PREFIX = 'inbox/'

export function toLocalFieldNoteUrl(relativePath: string): string {
  return `${FIELDNOTE_LOCAL_URL_PREFIX}${relativePath}`
}

export function isLocalFieldNoteMedia(media: {
  url?: string | null
  filename?: string | null
}): boolean {
  if (media.url?.startsWith(FIELDNOTE_LOCAL_URL_PREFIX)) return true
  return Boolean(media.filename?.startsWith(INBOX_PREFIX))
}

export function resolveLocalFieldNoteRelativePath(media: {
  url?: string | null
  filename?: string | null
}): string {
  if (media.url?.startsWith(FIELDNOTE_LOCAL_URL_PREFIX)) {
    return media.url.slice(FIELDNOTE_LOCAL_URL_PREFIX.length)
  }
  if (media.filename?.startsWith(INBOX_PREFIX)) {
    return media.filename
  }
  throw new Error('Not a local field note media path')
}

/** Public URL stored on Media — inbox files use fieldnote-local:, artwork uses CDN. */
export function resolveMediaStorageUrl(filename: string): string {
  if (filename.startsWith(INBOX_PREFIX)) {
    return toLocalFieldNoteUrl(filename)
  }
  const domain = process.env.NEXT_PUBLIC_IMAGE_DOMAIN?.replace(/\/$/, '')
  if (!domain) {
    throw new Error('NEXT_PUBLIC_IMAGE_DOMAIN is not configured')
  }
  return `${domain}/${filename}`
}

export function studioLocalMediaApiPath(relativePath: string): string {
  return `/api/studio/local-media/${relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`
}

export type MediaPreviewDoc = {
  url?: string | null
  thumbnailURL?: string | null
  alt?: string | null
  sizes?: {
    thumbnail?: { url?: string | null }
  }
}

export function mediaPreviewUrl(doc: MediaPreviewDoc): string | null {
  return doc.thumbnailURL ?? doc.sizes?.thumbnail?.url ?? doc.url ?? null
}

export function normalizeMediaApiResponse(raw: unknown): MediaPreviewDoc | null {
  if (!raw || typeof raw !== 'object') return null
  if ('doc' in raw && raw.doc && typeof raw.doc === 'object') {
    return raw.doc as MediaPreviewDoc
  }
  return raw as MediaPreviewDoc
}

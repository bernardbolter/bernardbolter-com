import type { CollectionAfterChangeHook, Payload } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { Media } from '@/payload-types'

import { generateClipEmbedding } from '@/utilities/generateClipEmbedding'
import { persistArtworkClipEmbedding } from '@/utilities/persistArtworkClipEmbedding'

function ensureAbsoluteImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const base = process.env.NEXT_PUBLIC_IMAGE_DOMAIN ?? ''
  if (!base) return url
  return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

async function resolvePrimaryImageUrl(
  doc: { primaryImage?: number | Media | null },
  payload: Payload,
): Promise<string | null> {
  const ref = doc.primaryImage
  if (!ref) return null
  if (typeof ref === 'object' && ref && 'url' in ref && ref.url) {
    return ensureAbsoluteImageUrl(ref.url)
  }
  const media = await payload.findByID({
    collection: 'media',
    id: ref as number,
    depth: 0,
  })
  if (media?.url) {
    return ensureAbsoluteImageUrl(media.url)
  }
  return null
}

export const artworkAfterChange: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
  context,
}) => {
  if (context?.skipEmbedding) {
    return doc
  }
  if (operation !== 'create' && operation !== 'update') {
    return doc
  }

  try {
    revalidateTag('artworks')
    revalidatePath('/', 'layout')
    if (typeof doc.slug === 'string' && doc.slug.trim()) {
      const path = `/${doc.slug.trim()}`
      revalidatePath(path)
      revalidatePath(`${path}/embedding`)
    }
  } catch {
    // No Next.js static generation store (seed scripts, tests)
  }
  if (!process.env.CLIP_EMBEDDING_URL) {
    return doc
  }
  if (!doc.primaryImage) {
    return doc
  }

  void (async () => {
    try {
      const imageUrl = await resolvePrimaryImageUrl(doc, req.payload)
      if (!imageUrl) {
        req.payload.logger.warn({ msg: 'CLIP embedding skipped: no image URL', id: doc.id })
        return
      }
      const embedding = await generateClipEmbedding(imageUrl)
      await persistArtworkClipEmbedding(req.payload, doc.id, embedding)
    } catch (err) {
      req.payload.logger.error({
        msg: 'CLIP embedding failed',
        id: doc.id,
        err,
      })
    }
  })()

  return doc
}

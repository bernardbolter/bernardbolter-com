import type { CollectionAfterChangeHook, Payload } from 'payload'
import type { Artwork, Media } from '@/payload-types'

import { revalidateArchive } from '@/lib/cache/revalidateArchive'

import { generateClipEmbedding } from '@/utilities/generateClipEmbedding'
import { persistArtworkClipEmbedding } from '@/utilities/persistArtworkClipEmbedding'
import { CLIP_EMBEDDING_METADATA } from '@/lib/artwork/visionPage'

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

  const paths = ['/', '/corpus', '/sessions', '/api/corpus', '/api/corpus/index']
  if (typeof doc.slug === 'string' && doc.slug.trim()) {
    const slug = doc.slug.trim()
    const path = `/${slug}`
    paths.push(path, `${path}/vision`, `${path}/record`, `/api/corpus/${slug}`)
  }
  revalidateArchive({ tags: ['artworks', 'corpus'], paths })
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
      const generatedAt = new Date()
      await persistArtworkClipEmbedding(req.payload, doc.id, embedding, generatedAt)

      const existing = Array.isArray(doc.embeddings) ? doc.embeddings : []
      const hasClipEntry = existing.some(
        (entry: NonNullable<Artwork['embeddings']>[number]) =>
          entry &&
          typeof entry === 'object' &&
          (entry.model === CLIP_EMBEDDING_METADATA.model ||
            entry.pgVectorColumn === CLIP_EMBEDDING_METADATA.pgVectorColumn),
      )

      if (!hasClipEntry) {
        await req.payload.update({
          collection: 'artworks',
          id: doc.id,
          data: {
            embeddings: [
              ...existing,
              {
                model: CLIP_EMBEDDING_METADATA.model,
                dimensions: CLIP_EMBEDDING_METADATA.dimensions,
                pgVectorColumn: CLIP_EMBEDDING_METADATA.pgVectorColumn,
                specUrl: CLIP_EMBEDDING_METADATA.specUrl,
                shortDescription: CLIP_EMBEDDING_METADATA.shortDescription,
                generatedDate: generatedAt.toISOString(),
              },
            ],
          },
          context: { skipEmbedding: true },
          req,
        })
      }
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

import type { CollectionAfterChangeHook, Payload, PayloadRequest } from 'payload'
import type { Artwork, Media } from '@/payload-types'

import { revalidateArchive } from '@/lib/cache/revalidateArchive'
import { artworkPublicRevalidatePaths } from '@/lib/cache/artworkPublicRevalidatePaths'
import { revalidateCorpusFeed } from '@/lib/cache/revalidateCorpusFeed'
import { resolveReasoningEmbeddingSource } from '@/lib/artwork/reasoningEmbeddingSource'
import {
  CLIP_EMBEDDING_METADATA,
  REASONING_TEXT_EMBEDDING_METADATA,
} from '@/lib/artwork/visionPage'

import { generateClipEmbedding } from '@/utilities/generateClipEmbedding'
import { generateReasoningTextEmbedding } from '@/utilities/generateReasoningTextEmbedding'
import { persistArtworkClipEmbedding } from '@/utilities/persistArtworkClipEmbedding'
import { persistArtworkReasoningEmbedding } from '@/utilities/persistArtworkReasoningEmbedding'

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

function reasoningSourceFieldsChanged(
  doc: Artwork,
  previousDoc: Artwork | undefined,
  operation: string,
): boolean {
  if (operation === 'create') return true
  if (!previousDoc) return true

  if (
    (doc.formalContributionAssessment ?? '').trim() !==
    (previousDoc.formalContributionAssessment ?? '').trim()
  ) {
    return true
  }

  return JSON.stringify(doc.visionAnalyses ?? []) !== JSON.stringify(previousDoc.visionAnalyses ?? [])
}

async function maybeAppendEmbeddingMetadata(
  payload: Payload,
  doc: Artwork,
  meta: typeof CLIP_EMBEDDING_METADATA | typeof REASONING_TEXT_EMBEDDING_METADATA,
  generatedAt: Date,
  req: PayloadRequest,
): Promise<void> {
  const existing = Array.isArray(doc.embeddings) ? doc.embeddings : []
  const hasEntry = existing.some(
    (entry: NonNullable<Artwork['embeddings']>[number]) =>
      entry &&
      typeof entry === 'object' &&
      (entry.model === meta.model || entry.pgVectorColumn === meta.pgVectorColumn),
  )
  if (hasEntry) return

  await payload.update({
    collection: 'artworks',
    id: doc.id,
    data: {
      embeddings: [
        ...existing,
        {
          model: meta.model,
          dimensions: meta.dimensions,
          pgVectorColumn: meta.pgVectorColumn,
          specUrl: meta.specUrl,
          shortDescription: meta.shortDescription,
          generatedDate: generatedAt.toISOString(),
        },
      ],
    },
    context: { skipEmbedding: true },
    req,
  })
}

export const artworkAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
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

  const paths = artworkPublicRevalidatePaths(
    typeof doc.slug === 'string' ? doc.slug : '',
  )
  revalidateArchive({ tags: ['artworks'], paths })
  revalidateCorpusFeed({
    artworkSlug: typeof doc.slug === 'string' ? doc.slug : undefined,
  })

  if (process.env.CLIP_EMBEDDING_URL && doc.primaryImage) {
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
        await maybeAppendEmbeddingMetadata(
          req.payload,
          doc,
          CLIP_EMBEDDING_METADATA,
          generatedAt,
          req,
        )
      } catch (err) {
        req.payload.logger.error({
          msg: 'CLIP embedding failed',
          id: doc.id,
          err,
        })
      }
    })()
  }

  if (
    process.env.REASONING_TEXT_EMBEDDING_URL &&
    reasoningSourceFieldsChanged(doc, previousDoc as Artwork | undefined, operation)
  ) {
    void (async () => {
      try {
        const source = resolveReasoningEmbeddingSource(doc)
        if (!source) {
          return
        }
        const embedding = await generateReasoningTextEmbedding(source.sourceText)
        const generatedAt = new Date()
        await persistArtworkReasoningEmbedding(
          req.payload,
          doc.id,
          embedding,
          source.sourceType,
          generatedAt,
        )
        await maybeAppendEmbeddingMetadata(
          req.payload,
          doc,
          REASONING_TEXT_EMBEDDING_METADATA,
          generatedAt,
          req,
        )
      } catch (err) {
        req.payload.logger.error({
          msg: 'Reasoning-text embedding failed',
          id: doc.id,
          err,
        })
      }
    })()
  }

  return doc
}

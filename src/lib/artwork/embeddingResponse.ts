import type { Artwork } from '@/payload-types'

import { collectArtworkSameAsUris } from '@/lib/artwork/sameAsUris'
import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'

export const CLIP_EMBEDDING_MODEL = 'openai/clip-vit-large-patch14' as const

export type ArtworkEmbeddingJson = {
  artwork: string
  sameAs: string[]
  model: typeof CLIP_EMBEDDING_MODEL
  dimensions: typeof CLIP_EMBEDDING_DIMENSIONS
  embedding: number[]
}

export type ArtworkEmbeddingPendingJson = {
  status: 'pending'
  message: string
}

export function buildArtworkEmbeddingResponse(
  artwork: Artwork,
  artworkUrl: string,
  embedding: number[],
): ArtworkEmbeddingJson {
  const sameAs = collectArtworkSameAsUris(artwork)
  return {
    artwork: artworkUrl,
    sameAs,
    model: CLIP_EMBEDDING_MODEL,
    dimensions: CLIP_EMBEDDING_DIMENSIONS,
    embedding,
  }
}

export function buildArtworkEmbeddingPendingResponse(): ArtworkEmbeddingPendingJson {
  return {
    status: 'pending',
    message: 'Embedding not yet generated',
  }
}

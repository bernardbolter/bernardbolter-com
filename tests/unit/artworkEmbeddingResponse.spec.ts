import { describe, expect, it } from 'vitest'

import {
  buildArtworkEmbeddingPendingResponse,
  buildArtworkEmbeddingResponse,
  CLIP_EMBEDDING_MODEL,
} from '@/lib/artwork/embeddingResponse'
import { collectArtworkSameAsUris } from '@/lib/artwork/sameAsUris'
import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'
import type { Artwork } from '@/payload-types'

describe('collectArtworkSameAsUris', () => {
  it('merges sameAs and sameAsUrls without duplicates', () => {
    const artwork = {
      sameAs: [{ url: 'https://example.org/a' }],
      sameAsUrls: [
        { url: 'https://example.org/a' },
        { url: 'https://wikidata.org/entity/Q1' },
      ],
    } as Artwork

    expect(collectArtworkSameAsUris(artwork)).toEqual([
      'https://example.org/a',
      'https://wikidata.org/entity/Q1',
    ])
  })
})

describe('buildArtworkEmbeddingResponse', () => {
  it('returns the spec JSON shape', () => {
    const embedding = Array.from({ length: CLIP_EMBEDDING_DIMENSIONS }, (_, i) => i * 0.001)
    const artwork = {
      sameAs: [{ url: 'https://example.org/work' }],
    } as Artwork

    const body = buildArtworkEmbeddingResponse(
      artwork,
      'https://bernardbolter.com/gates-iii',
      embedding,
    )

    expect(body.artwork).toBe('https://bernardbolter.com/gates-iii')
    expect(body.sameAs).toEqual(['https://example.org/work'])
    expect(body.model).toBe(CLIP_EMBEDDING_MODEL)
    expect(body.dimensions).toBe(CLIP_EMBEDDING_DIMENSIONS)
    expect(body.embedding).toHaveLength(CLIP_EMBEDDING_DIMENSIONS)
  })

  it('returns pending payload for missing embeddings', () => {
    expect(buildArtworkEmbeddingPendingResponse()).toEqual({
      status: 'pending',
      message: 'Embedding not yet generated',
    })
  })
})

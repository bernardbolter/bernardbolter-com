import { describe, expect, it } from 'vitest'

import { buildVisualEmbeddingJsonLd } from '@/lib/jsonld/visualEmbedding'
import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'

describe('buildVisualEmbeddingJsonLd', () => {
  it('builds artism VisualEmbedding with full vector', () => {
    const embedding = Array.from({ length: CLIP_EMBEDDING_DIMENSIONS }, (_, index) => index * 0.001)
    const jsonLd = buildVisualEmbeddingJsonLd(
      { title: 'Test Work', slug: 'test-work' },
      'https://bernardbolter.com/test-work',
      embedding,
    )

    expect(jsonLd['@type']).toBe('artism:VisualEmbedding')
    expect(jsonLd.isPartOf).toEqual({
      '@type': 'VisualArtwork',
      name: 'Test Work',
      url: 'https://bernardbolter.com/test-work',
    })
    expect(jsonLd['artism:model']).toBe('CLIP-ViT-L-14')
    expect(jsonLd['artism:dimensions']).toBe(768)
    expect(jsonLd['artism:vector']).toHaveLength(CLIP_EMBEDDING_DIMENSIONS)
    expect(jsonLd['artism:generatedDate']).toBeUndefined()
  })

  it('includes generated date only when provided', () => {
    const embedding = [0.1, 0.2]
    const jsonLd = buildVisualEmbeddingJsonLd(
      { title: 'Test Work', slug: 'test-work' },
      'https://bernardbolter.com/test-work',
      embedding,
      '2024-06-01',
    )

    expect(jsonLd['artism:generatedDate']).toBe('2024-06-01')
  })
})

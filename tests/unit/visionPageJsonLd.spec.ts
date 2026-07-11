import { describe, expect, it } from 'vitest'

import { buildVisionPageJsonLd } from '@/lib/jsonld/visionPage'
import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'
import type { Artwork } from '@/payload-types'

function minimalArtwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: 1,
    title: 'Test Work',
    slug: 'test-work',
    yearCreated: 2019,
    status: 'published',
    medium: 'acrylic-on-canvas',
    primaryImage: {
      id: 1,
      url: 'https://cdn.example.com/original.jpg',
      updatedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Artwork
}

describe('buildVisionPageJsonLd', () => {
  it('builds artism VisionPage with full vector and direct R2 image', () => {
    const embedding = Array.from({ length: CLIP_EMBEDDING_DIMENSIONS }, (_, index) => index * 0.001)
    const jsonLd = buildVisionPageJsonLd(
      minimalArtwork({
        embeddings: [
          {
            model: 'clip-vit-large-patch14',
            dimensions: 768,
            pgVectorColumn: 'clip_embedding',
            specUrl: 'https://huggingface.co/openai/clip-vit-large-patch14',
            generatedDate: '2024-06-01T00:00:00.000Z',
          },
        ],
        visionAnalyses: [
          {
            text: 'Strong diagonal from lower-left.',
            model: 'claude-sonnet-4-6',
            date: '2026-07-08T00:00:00.000Z',
          },
        ],
      }),
      'https://bernardbolter.com/test-work',
      { clip_embedding: embedding },
    )

    expect(jsonLd?.['@type']).toBe('artism:VisionPage')
    expect(jsonLd?.isPartOf).toEqual({
      '@type': 'VisualArtwork',
      name: 'Test Work',
      url: 'https://bernardbolter.com/test-work',
      image: 'https://cdn.example.com/original.jpg',
    })

    const embeddings = jsonLd?.['artism:embeddings'] as Array<Record<string, unknown>>
    expect(embeddings).toHaveLength(1)
    expect(embeddings[0]?.['artism:model']).toBe('clip-vit-large-patch14')
    expect(embeddings[0]?.['artism:vector']).toHaveLength(CLIP_EMBEDDING_DIMENSIONS)
    expect(embeddings[0]?.dateCreated).toBe('2024-06-01')

    const analyses = jsonLd?.['artism:visionAnalyses'] as Array<Record<string, unknown>>
    expect(analyses).toHaveLength(1)
    expect(analyses[0]?.['artism:model']).toBe('claude-sonnet-4-6')
    expect(analyses[0]?.dateCreated).toBe('2026-07-08')
  })

  it('omits vision analyses when empty and returns null without vectors', () => {
    const jsonLd = buildVisionPageJsonLd(
      minimalArtwork(),
      'https://bernardbolter.com/test-work',
      {},
    )

    expect(jsonLd).toBeNull()
  })
})

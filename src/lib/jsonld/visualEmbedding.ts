import type { Artwork } from '@/payload-types'

import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'

const ARTISM_CONTEXT = {
  '@vocab': 'https://schema.org/',
  artism: 'https://artism.org/schema/',
} as const

export type VisualEmbeddingJsonLd = {
  '@context': typeof ARTISM_CONTEXT
  '@type': 'artism:VisualEmbedding'
  isPartOf: {
    '@type': 'VisualArtwork'
    name: string
    url: string
  }
  'artism:model': 'CLIP-ViT-L-14'
  'artism:dimensions': typeof CLIP_EMBEDDING_DIMENSIONS
  'artism:generatedDate'?: string
  'artism:vector': number[]
}

export function buildVisualEmbeddingJsonLd(
  artwork: Pick<Artwork, 'title' | 'slug'>,
  artworkUrl: string,
  embedding: number[],
  generatedDate?: string | null,
): VisualEmbeddingJsonLd {
  const title = artwork.title?.trim() || 'Artwork'
  const jsonLd: VisualEmbeddingJsonLd = {
    '@context': ARTISM_CONTEXT,
    '@type': 'artism:VisualEmbedding',
    isPartOf: {
      '@type': 'VisualArtwork',
      name: title,
      url: artworkUrl,
    },
    'artism:model': 'CLIP-ViT-L-14',
    'artism:dimensions': CLIP_EMBEDDING_DIMENSIONS,
    'artism:vector': embedding,
  }

  if (generatedDate?.trim()) {
    jsonLd['artism:generatedDate'] = generatedDate.trim()
  }

  return jsonLd
}

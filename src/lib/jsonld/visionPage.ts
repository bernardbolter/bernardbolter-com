import type { Artwork } from '@/payload-types'

import { CORPUS_CONTEXT } from '@/lib/corpus/constants'
import {
  getDirectR2ImageUrl,
  resolveEmbeddingMetadataList,
  resolveVisionAnalyses,
  toIsoDateOnly,
  type EmbeddingMetadata,
  type VisionAnalysisEntry,
} from '@/lib/artwork/visionPage'

export type VisionPageJsonLdEmbedding = {
  '@type': 'art-official:Embedding'
  'art-official:model': string
  'art-official:dimensions': number
  'art-official:vector': number[]
  'art-official:specUrl'?: string
  'art-official:shortDescription'?: string
  dateCreated?: string
}

export type VisionPageJsonLdAnalysis = {
  '@type': 'art-official:VisionAnalysis'
  text: string
  'art-official:model': string
  dateCreated: string
}

export type VisionPageJsonLd = {
  '@context': typeof CORPUS_CONTEXT
  '@type': 'art-official:VisionPage'
  isPartOf: {
    '@type': 'VisualArtwork'
    name: string
    url: string
    image?: string
  }
  'art-official:embeddings': VisionPageJsonLdEmbedding[]
  'art-official:visionAnalyses'?: VisionPageJsonLdAnalysis[]
}

function buildEmbeddingJsonLd(
  metadata: EmbeddingMetadata,
  vector: number[],
): VisionPageJsonLdEmbedding {
  const entry: VisionPageJsonLdEmbedding = {
    '@type': 'art-official:Embedding',
    'art-official:model': metadata.model,
    'art-official:dimensions': metadata.dimensions,
    'art-official:vector': vector,
  }

  if (metadata.specUrl?.trim()) {
    entry['art-official:specUrl'] = metadata.specUrl.trim()
  }

  if (metadata.shortDescription?.trim()) {
    entry['art-official:shortDescription'] = metadata.shortDescription.trim()
  }

  const dateCreated = toIsoDateOnly(metadata.generatedDate)
  if (dateCreated) entry.dateCreated = dateCreated

  return entry
}

function buildAnalysisJsonLd(analysis: VisionAnalysisEntry): VisionPageJsonLdAnalysis {
  return {
    '@type': 'art-official:VisionAnalysis',
    text: analysis.text,
    'art-official:model': analysis.model,
    dateCreated: toIsoDateOnly(analysis.date) ?? analysis.date,
  }
}

export function buildVisionPageJsonLd(
  artwork: Artwork,
  artworkUrl: string,
  vectorsByColumn: Record<string, number[]>,
): VisionPageJsonLd | null {
  const metadataList = resolveEmbeddingMetadataList(artwork)
  const embeddings = metadataList.flatMap((metadata) => {
    const vector = vectorsByColumn[metadata.pgVectorColumn]
    if (!vector?.length) return []
    return [buildEmbeddingJsonLd(metadata, vector)]
  })

  if (embeddings.length === 0) return null

  const title = artwork.title?.trim() || 'Artwork'
  const directImageUrl = getDirectR2ImageUrl(artwork)
  const analyses = resolveVisionAnalyses(artwork)

  const jsonLd: VisionPageJsonLd = {
    '@context': CORPUS_CONTEXT,
    '@type': 'art-official:VisionPage',
    isPartOf: {
      '@type': 'VisualArtwork',
      name: title,
      url: artworkUrl,
      ...(directImageUrl ? { image: directImageUrl } : {}),
    },
    'art-official:embeddings': embeddings,
  }

  if (analyses.length > 0) {
    jsonLd['art-official:visionAnalyses'] = analyses.map(buildAnalysisJsonLd)
  }

  return jsonLd
}

export function buildCorpusEmbeddingMetadata(
  metadata: EmbeddingMetadata,
): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    '@type': 'art-official:Embedding',
    'art-official:model': metadata.model,
    'art-official:dimensions': metadata.dimensions,
  }

  if (metadata.specUrl?.trim()) {
    entry['art-official:specUrl'] = metadata.specUrl.trim()
  }

  if (metadata.shortDescription?.trim()) {
    entry['art-official:shortDescription'] = metadata.shortDescription.trim()
  }

  const dateCreated = toIsoDateOnly(metadata.generatedDate)
  if (dateCreated) entry.dateCreated = dateCreated

  return entry
}

export function buildCorpusVisionAnalyses(
  artwork: Artwork,
): Array<Record<string, unknown>> | undefined {
  const analyses = resolveVisionAnalyses(artwork)
  if (analyses.length === 0) return undefined

  return analyses.map((analysis) => ({
    '@type': 'art-official:VisionAnalysis',
    text: analysis.text,
    'art-official:model': analysis.model,
    dateCreated: toIsoDateOnly(analysis.date) ?? analysis.date,
  }))
}

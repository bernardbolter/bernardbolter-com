import type { Artwork } from '@/payload-types'

import {
  getDirectR2ImageUrl,
  resolveEmbeddingMetadataList,
  resolveVisionAnalyses,
  toIsoDateOnly,
  type EmbeddingMetadata,
  type VisionAnalysisEntry,
} from '@/lib/artwork/visionPage'

const ARTISM_CONTEXT = {
  '@vocab': 'https://schema.org/',
  artism: 'https://artism.org/schema/',
} as const

export type VisionPageJsonLdEmbedding = {
  '@type': 'artism:Embedding'
  'artism:model': string
  'artism:dimensions': number
  'artism:vector': number[]
  'artism:specUrl'?: string
  'artism:shortDescription'?: string
  dateCreated?: string
}

export type VisionPageJsonLdAnalysis = {
  '@type': 'artism:VisionAnalysis'
  text: string
  'artism:model': string
  dateCreated: string
}

export type VisionPageJsonLd = {
  '@context': typeof ARTISM_CONTEXT
  '@type': 'artism:VisionPage'
  isPartOf: {
    '@type': 'VisualArtwork'
    name: string
    url: string
    image?: string
  }
  'artism:embeddings': VisionPageJsonLdEmbedding[]
  'artism:visionAnalyses'?: VisionPageJsonLdAnalysis[]
}

function buildEmbeddingJsonLd(
  metadata: EmbeddingMetadata,
  vector: number[],
): VisionPageJsonLdEmbedding {
  const entry: VisionPageJsonLdEmbedding = {
    '@type': 'artism:Embedding',
    'artism:model': metadata.model,
    'artism:dimensions': metadata.dimensions,
    'artism:vector': vector,
  }

  if (metadata.specUrl?.trim()) {
    entry['artism:specUrl'] = metadata.specUrl.trim()
  }

  if (metadata.shortDescription?.trim()) {
    entry['artism:shortDescription'] = metadata.shortDescription.trim()
  }

  const dateCreated = toIsoDateOnly(metadata.generatedDate)
  if (dateCreated) entry.dateCreated = dateCreated

  return entry
}

function buildAnalysisJsonLd(analysis: VisionAnalysisEntry): VisionPageJsonLdAnalysis {
  return {
    '@type': 'artism:VisionAnalysis',
    text: analysis.text,
    'artism:model': analysis.model,
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
    '@context': ARTISM_CONTEXT,
    '@type': 'artism:VisionPage',
    isPartOf: {
      '@type': 'VisualArtwork',
      name: title,
      url: artworkUrl,
      ...(directImageUrl ? { image: directImageUrl } : {}),
    },
    'artism:embeddings': embeddings,
  }

  if (analyses.length > 0) {
    jsonLd['artism:visionAnalyses'] = analyses.map(buildAnalysisJsonLd)
  }

  return jsonLd
}

export function buildCorpusEmbeddingMetadata(
  metadata: EmbeddingMetadata,
): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    '@type': 'artism:Embedding',
    'artism:model': metadata.model,
    'artism:dimensions': metadata.dimensions,
  }

  if (metadata.specUrl?.trim()) {
    entry['artism:specUrl'] = metadata.specUrl.trim()
  }

  if (metadata.shortDescription?.trim()) {
    entry['artism:shortDescription'] = metadata.shortDescription.trim()
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
    '@type': 'artism:VisionAnalysis',
    text: analysis.text,
    'artism:model': analysis.model,
    dateCreated: toIsoDateOnly(analysis.date) ?? analysis.date,
  }))
}

import type { Artwork } from '@/payload-types'

import { getArtworkOriginalImageUrl } from '@/lib/media/artworkR2Images'

export const CLIP_EMBEDDING_METADATA = {
  model: 'clip-vit-large-patch14',
  dimensions: 768,
  pgVectorColumn: 'clip_embedding',
  specUrl: 'https://huggingface.co/openai/clip-vit-large-patch14',
  shortDescription: 'Language-informed visual embedding — 768 dimensions',
} as const

export type EmbeddingMetadata = {
  model: string
  dimensions: number
  pgVectorColumn: string
  generatedDate?: string | null
  specUrl?: string | null
  shortDescription?: string | null
}

export type VisionAnalysisEntry = {
  text: string
  model: string
  date: string
}

const EMBEDDING_MODEL_LABELS: Record<string, string> = {
  'clip-vit-large-patch14': 'CLIP ViT-L/14',
  'dinov2-large': 'DINOv2 Large',
}

const VISION_MODEL_LABELS: Record<string, string> = {
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'gpt-4o': 'GPT-4o',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'deepseek-vl2': 'DeepSeek VL2',
}

/** Direct R2 URL from primary/poster media — spec `imageUrl` field equivalent. */
export function getDirectR2ImageUrl(artwork: Artwork): string | null {
  return getArtworkOriginalImageUrl(artwork)
}

export function formatEmbeddingModelLabel(model: string): string {
  const trimmed = model.trim()
  return EMBEDDING_MODEL_LABELS[trimmed] ?? trimmed
}

export function formatVisionModelLabel(model: string): string {
  const trimmed = model.trim()
  if (VISION_MODEL_LABELS[trimmed]) return VISION_MODEL_LABELS[trimmed]

  if (trimmed.startsWith('claude-')) {
    const parts = trimmed.replace(/^claude-/, '').split('-')
    const version = parts.pop()
    const name = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
    return version ? `Claude ${name} ${version.replace(/-/g, '.')}` : `Claude ${name}`
  }

  if (trimmed.startsWith('gpt-')) {
    return trimmed.toUpperCase().replace('GPT-', 'GPT-')
  }

  if (trimmed.startsWith('gemini-')) {
    const rest = trimmed.replace(/^gemini-/, '').replace(/-/g, ' ')
    return `Gemini ${rest.charAt(0).toUpperCase()}${rest.slice(1)}`
  }

  if (trimmed.startsWith('deepseek-')) {
    const rest = trimmed.replace(/^deepseek-/, '')
    return `DeepSeek ${rest.toUpperCase()}`
  }

  return trimmed
}

export function formatMonthYear(value?: string | null): string | null {
  if (!value?.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('en-GB', { month: 'short', year: 'numeric' })
}

export function toIsoDateOnly(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().slice(0, 10)
}

export function vectorTeasePreview(embedding: number[], count = 10): string {
  const preview = embedding.slice(0, count)
  return preview.map((value) => value.toFixed(3)).join(', ')
}

export function analysisPreview(text: string, maxSentences = 3): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed]
  const preview = sentences
    .slice(0, maxSentences)
    .map((sentence) => sentence.trim())
    .join(' ')
    .trim()
  if (sentences.length <= maxSentences) return preview
  return `${preview.replace(/\s+$/, '')}…`
}

export function resolveEmbeddingMetadataList(artwork: Artwork): EmbeddingMetadata[] {
  const rows = artwork.embeddings ?? []
  const resolved = rows
    .filter((row) => row?.model?.trim() && row.dimensions != null && row.pgVectorColumn?.trim())
    .map((row) => ({
      model: row.model!.trim(),
      dimensions: Number(row.dimensions),
      pgVectorColumn: row.pgVectorColumn!.trim(),
      generatedDate: row.generatedDate ?? null,
      specUrl: row.specUrl ?? null,
      shortDescription: row.shortDescription ?? null,
    }))

  if (resolved.length > 0) return resolved

  if (Array.isArray(artwork.clipEmbedding) && artwork.clipEmbedding.length > 0) {
    return [
      {
        ...CLIP_EMBEDDING_METADATA,
        generatedDate: artwork.clipEmbeddingGeneratedAt ?? null,
      },
    ]
  }

  return []
}

export function artworkHasEmbeddingMetadata(artwork: Artwork): boolean {
  return resolveEmbeddingMetadataList(artwork).length > 0
}

export function resolveVisionAnalyses(artwork: Artwork): VisionAnalysisEntry[] {
  return (artwork.visionAnalyses ?? [])
    .filter((row) => row?.text?.trim() && row.model?.trim() && row.date?.trim())
    .map((row) => ({
      text: row.text!.trim(),
      model: row.model!.trim(),
      date: row.date!.trim(),
    }))
}

export function latestVisionAnalysis(artwork: Artwork): VisionAnalysisEntry | null {
  const analyses = resolveVisionAnalyses(artwork)
  return analyses.length > 0 ? analyses[analyses.length - 1]! : null
}

export function visionPageUrl(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${slug}/vision`
}

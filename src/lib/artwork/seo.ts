import type { Artwork, Series } from '@/payload-types'

import { formatArtworkYearRange } from '@/lib/artwork/artworkLabels'
import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import { truncateAtWordBoundary } from '@/lib/seo/truncateAtWordBoundary'

export const ARTWORK_META_DESCRIPTION_MAX = 155

type ArtworkSeoSource = Pick<
  Artwork,
  | 'title'
  | 'descriptionShort'
  | 'metaTitle'
  | 'metaDescription'
  | 'intent'
  | 'yearCreated'
  | 'yearCompleted'
  | 'medium'
  | 'mediumOther'
  | 'series'
>

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveSeriesName(artwork: Pick<ArtworkSeoSource, 'series'>): string | null {
  const series = artwork.series
  if (series && typeof series === 'object') {
    const name = (series as Series).name?.trim()
    if (name) return name
  }
  return null
}

/** Catalogue label line when no prose is available: title, year, medium, series. */
export function buildArtworkLabelDescription(artwork: ArtworkSeoSource): string {
  const title = trimString(artwork.title) || 'Artwork'
  const parts: string[] = [title]
  if (typeof artwork.yearCreated === 'number') {
    parts.push(formatArtworkYearRange(artwork))
  }
  const medium = resolveMediumLabel(artwork)
  if (medium) parts.push(medium)
  const seriesName = resolveSeriesName(artwork)
  if (seriesName) parts.push(seriesName)
  return parts.join(', ')
}

/**
 * Public SEO strings: metaDescription → descriptionShort → intent → label line.
 * Always capped ~155 chars at a word boundary for meta / og / twitter.
 */
export function resolveArtworkSeo(artwork: ArtworkSeoSource): {
  title: string | undefined
  description: string | undefined
} {
  const title = trimString(artwork.title)
  const metaTitle = trimString(artwork.metaTitle)

  const metaDescription = trimString(artwork.metaDescription)
  const descriptionShort = trimString(artwork.descriptionShort)
  const intent = trimString(artwork.intent)
  const label = buildArtworkLabelDescription(artwork)

  const raw = metaDescription || descriptionShort || intent || label
  const description = raw ? truncateAtWordBoundary(raw, ARTWORK_META_DESCRIPTION_MAX) : undefined

  return {
    title: metaTitle || title || undefined,
    description: description || undefined,
  }
}

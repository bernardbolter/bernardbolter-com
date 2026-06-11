import type { Artwork } from '@/payload-types'

import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import { sizeTierLabel } from '@/utilities/artworkSizeDisplay'

const SUPPORT_LABELS: Record<string, string> = {
  canvas: 'Canvas',
  paper: 'Paper',
  board: 'Board',
  screen: 'Screen',
  file: 'File',
  other: 'Other',
}

const WORK_STATE_LABELS: Record<string, string> = {
  original: 'Original',
  reworked: 'Reworked',
  restored: 'Restored',
  damaged: 'Damaged',
  lost: 'Lost',
}

const EDITION_TYPE_LABELS: Record<string, string> = {
  unique: 'Unique',
  'limited-edition': 'Limited edition',
  'open-edition': 'Open edition',
  'artist-proof-only': 'Artist proof only',
}

const FRAMING_LABELS: Record<string, string> = {
  framed: 'Framed',
  unframed: 'Unframed',
  'artist-framed': 'Artist framed',
}

export function resolveSupportLabel(artwork: Pick<Artwork, 'support'>): string | null {
  if (!artwork.support) return null
  return SUPPORT_LABELS[artwork.support] ?? artwork.support
}

export function resolveWallLabelMedium(artwork: Artwork): string {
  const styleTag = artwork.styleTags?.find((tag) => typeof tag === 'object' && tag?.label)
  if (styleTag && typeof styleTag === 'object' && styleTag.label?.trim()) {
    return styleTag.label.trim()
  }
  return resolveMediumLabel(artwork)
}

export function formatArtworkYearRange(artwork: Pick<Artwork, 'yearCreated' | 'yearCompleted'>): string {
  const start = artwork.yearCreated
  if (artwork.yearCompleted != null && artwork.yearCompleted !== start) {
    return `${start}–${artwork.yearCompleted}`
  }
  return String(start)
}

export function resolveWorkStateLabel(workState: Artwork['workState']): string | null {
  if (!workState) return null
  return WORK_STATE_LABELS[workState] ?? workState
}

export function resolveEditionTypeLabel(editionType: Artwork['editionType']): string | null {
  if (!editionType) return null
  return EDITION_TYPE_LABELS[editionType] ?? editionType
}

export function resolveFramingLabel(framing: Artwork['framing']): string | null {
  if (!framing) return null
  return FRAMING_LABELS[framing] ?? framing
}

export function resolveScaleLabel(artwork: Pick<Artwork, 'sizeTier'>): string {
  return sizeTierLabel(artwork.sizeTier)
}

export function isDigitalOnlyMeasurement(
  measurementType: Artwork['measurementType'],
): boolean {
  return Array.isArray(measurementType) && measurementType.length === 1 && measurementType[0] === 'digital'
}

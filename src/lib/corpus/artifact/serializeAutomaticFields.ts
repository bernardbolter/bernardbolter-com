import {
  AUTOMATIC_CONFLICT_FIELDS,
  readCommittedArtworkField,
} from '@/lib/artOfficial/automaticFieldConflicts'
import type { Artwork, Tag } from '@/payload-types'

function tagLabel(tag: number | Tag | null | undefined): string | null {
  if (!tag || typeof tag !== 'object') return null
  const label = typeof tag.label === 'string' ? tag.label.trim() : ''
  return label || null
}

function serializeValue(field: string, value: unknown): unknown {
  if (value == null || value === '') return null

  if (
    field === 'movementTags' ||
    field === 'styleTags' ||
    field === 'subjectTags' ||
    field === 'genreTags' ||
    field === 'periodTags'
  ) {
    if (!Array.isArray(value)) return null
    const labels = value
      .map((row) => tagLabel(row as number | Tag))
      .filter((label): label is string => Boolean(label))
    return labels.length ? labels : null
  }

  if (field === 'dominantColors' || field === 'paintedFieldColors') {
    if (!Array.isArray(value)) return null
    const hexes = value
      .map((row) => {
        if (!row || typeof row !== 'object') return null
        const hex = (row as { hex?: unknown }).hex
        return typeof hex === 'string' && hex.trim() ? hex.trim() : null
      })
      .filter((hex): hex is string => Boolean(hex))
    return hexes.length ? hexes : null
  }

  return value
}

/** Public-safe automatic-field snapshot for briefing (no location detail). */
export function serializeAutomaticFields(artwork: Artwork): Record<string, unknown> | null {
  const out: Record<string, unknown> = {}
  for (const field of AUTOMATIC_CONFLICT_FIELDS) {
    const raw = readCommittedArtworkField(artwork, field)
    const serialized = serializeValue(field, raw)
    if (serialized == null) continue
    out[field] = serialized
  }
  return Object.keys(out).length ? out : null
}

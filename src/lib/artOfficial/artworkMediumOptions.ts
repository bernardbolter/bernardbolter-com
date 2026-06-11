import type { Payload, TextField, Validate } from 'payload'

import { ensureArtworkMediumEnumValue } from './artworkMediumDatabase'
import { slugifyArtworkTitle } from './quickUploadDerived'

export type MediumOption = { label: string; value: string }

export const BUILTIN_ARTWORK_MEDIUM_OPTIONS: MediumOption[] = [
  { label: 'Acrylic photo transfer on canvas', value: 'acrylic-photo-transfer-on-canvas' },
  { label: 'Acrylic on canvas', value: 'acrylic-on-canvas' },
  { label: 'Mixed media on canvas', value: 'mixed-media-on-canvas' },
  { label: 'Photo collage', value: 'photo-collage' },
  { label: 'Video', value: 'video' },
  { label: 'Digital', value: 'digital' },
  { label: 'Other (add new…)', value: 'other' },
]

export const BUILTIN_VALUES = new Set(BUILTIN_ARTWORK_MEDIUM_OPTIONS.map((o) => o.value))

export type CustomMediumRow = {
  value: string
  label: string
  aatUri?: string | null
}

export const ART_OFFICIAL_SETTINGS_SLUG = 'art-official-settings'

export function mediumValueFromLabel(label: string): string {
  const base = slugifyArtworkTitle(label)
  if (!base) return 'custom-medium'
  if (BUILTIN_VALUES.has(base)) return `custom-${base}`
  return base
}

export async function getCustomMediums(payload: Payload): Promise<CustomMediumRow[]> {
  try {
    const global = await payload.findGlobal({
      slug: ART_OFFICIAL_SETTINGS_SLUG,
      depth: 0,
    })
    const rows = global?.customMediums
    if (!Array.isArray(rows)) return []
    return rows
      .filter(
        (row): row is CustomMediumRow =>
          typeof row === 'object' &&
          row !== null &&
          typeof (row as CustomMediumRow).value === 'string' &&
          typeof (row as CustomMediumRow).label === 'string',
      )
      .map((row) => ({
        value: row.value.trim(),
        label: row.label.trim(),
        aatUri: typeof row.aatUri === 'string' ? row.aatUri.trim() : undefined,
      }))
      .filter((row) => row.value && row.label && !BUILTIN_VALUES.has(row.value))
  } catch {
    return []
  }
}

export function buildArtworkMediumSelectOptions(
  custom: readonly CustomMediumRow[] = [],
): MediumOption[] {
  const customOptions = custom.map((row) => ({
    label: row.label,
    value: row.value,
  }))
  const builtinWithoutOther = BUILTIN_ARTWORK_MEDIUM_OPTIONS.filter((o) => o.value !== 'other')
  const other = BUILTIN_ARTWORK_MEDIUM_OPTIONS.find((o) => o.value === 'other')
  return [...builtinWithoutOther, ...customOptions, ...(other ? [other] : [])]
}

export async function listArtworkMediumOptions(payload?: Payload): Promise<MediumOption[]> {
  const custom = payload ? await getCustomMediums(payload) : []
  return buildArtworkMediumSelectOptions(custom)
}

/** Accepts built-in + custom media from art-official-settings (Quick Upload). */
export const validateArtworkMedium: Validate<string, unknown, unknown, TextField> = async (
  value,
  { required, req },
) => {
  const t = req.t
  if (value === undefined || value === null || value === '') {
    return required ? t('validation:required') : true
  }
  if (typeof value !== 'string') {
    return t('validation:invalidSelection')
  }
  const custom = req.payload ? await getCustomMediums(req.payload) : []
  if (isAllowedArtworkMedium(value, custom.map((row) => row.value))) {
    return true
  }
  return t('validation:invalidSelection')
}

export function isAllowedArtworkMedium(
  value: string,
  customValues: readonly string[] = [],
): boolean {
  return BUILTIN_VALUES.has(value) || customValues.includes(value)
}

/** Register a label as a reusable medium option; returns the select value to store on artworks. */
export async function registerCustomMedium(
  payload: Payload,
  label: string,
): Promise<{ value: string; label: string; created: boolean }> {
  const trimmed = label.trim()
  if (!trimmed) {
    throw new Error('Medium label is required.')
  }

  const value = mediumValueFromLabel(trimmed)
  const existing = await getCustomMediums(payload)
  const match = existing.find(
    (row) =>
      row.value === value ||
      row.label.toLowerCase() === trimmed.toLowerCase(),
  )
  if (match) {
    return { value: match.value, label: match.label, created: false }
  }

  const next = [...existing, { value, label: trimmed }].sort((a, b) =>
    a.label.localeCompare(b.label),
  )

  await payload.updateGlobal({
    slug: ART_OFFICIAL_SETTINGS_SLUG,
    data: { customMediums: next },
    overrideAccess: true,
  })

  await ensureArtworkMediumEnumValue(payload, value)

  return { value, label: trimmed, created: true }
}

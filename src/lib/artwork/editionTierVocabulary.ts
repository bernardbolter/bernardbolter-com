import type { Payload, TextField, Validate } from 'payload'

import { slugifyArtworkTitle } from '@/lib/artOfficial/quickUploadDerived'
import { ART_OFFICIAL_SETTINGS_SLUG } from '@/lib/artOfficial/artworkMediumOptions'

export const EDITION_TIER_SUBSTRATE_OPTIONS = [
  { label: 'Paper', value: 'paper' },
  { label: 'Aluminum mount', value: 'aluminum-mount' },
  { label: 'Canvas', value: 'canvas' },
  { label: 'Oil on canvas', value: 'oil-on-canvas' },
  { label: 'Other (add new…)', value: 'other' },
] as const

export const EDITION_TIER_PRINT_TECHNIQUE_OPTIONS = [
  { label: 'Giclée', value: 'giclee' },
  { label: 'Pigment print', value: 'pigment-print' },
  { label: 'Screenprint', value: 'screenprint' },
  { label: 'Lithograph', value: 'lithograph' },
  { label: 'Etching', value: 'etching' },
  { label: 'Digital C-print', value: 'digital-c-print' },
  { label: 'Other (add new…)', value: 'other' },
] as const

export type EditionVocabularyKind = 'substrate' | 'printTechnique'

export type EditionVocabularyOption = { label: string; value: string }

export type CustomEditionVocabularyRow = {
  value: string
  label: string
}

const BUILTIN_BY_KIND: Record<EditionVocabularyKind, EditionVocabularyOption[]> = {
  substrate: EDITION_TIER_SUBSTRATE_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
  })),
  printTechnique: EDITION_TIER_PRINT_TECHNIQUE_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
  })),
}

const GLOBAL_FIELD_BY_KIND: Record<EditionVocabularyKind, string> = {
  substrate: 'customEditionSubstrates',
  printTechnique: 'customEditionPrintTechniques',
}

const ADD_NEW_VALUE = 'other'

function builtinValues(kind: EditionVocabularyKind): Set<string> {
  return new Set(BUILTIN_BY_KIND[kind].map((option) => option.value))
}

export function vocabularyValueFromLabel(label: string, kind: EditionVocabularyKind): string {
  const base = slugifyArtworkTitle(label)
  if (!base) return kind === 'substrate' ? 'custom-substrate' : 'custom-print-technique'
  if (builtinValues(kind).has(base)) return `custom-${base}`
  return base
}

async function getCustomEditionVocabulary(
  payload: Payload,
  kind: EditionVocabularyKind,
): Promise<CustomEditionVocabularyRow[]> {
  try {
    const global = await payload.findGlobal({
      slug: ART_OFFICIAL_SETTINGS_SLUG,
      depth: 0,
    })
    const fieldName = GLOBAL_FIELD_BY_KIND[kind]
    const rows = (global as Record<string, unknown> | null)?.[fieldName]
    if (!Array.isArray(rows)) return []

    const builtins = builtinValues(kind)
    return rows
      .filter(
        (row): row is CustomEditionVocabularyRow =>
          typeof row === 'object' &&
          row !== null &&
          typeof (row as CustomEditionVocabularyRow).value === 'string' &&
          typeof (row as CustomEditionVocabularyRow).label === 'string',
      )
      .map((row) => ({
        value: row.value.trim(),
        label: row.label.trim(),
      }))
      .filter((row) => row.value && row.label && !builtins.has(row.value))
  } catch {
    return []
  }
}

export function buildEditionVocabularyOptions(
  kind: EditionVocabularyKind,
  custom: readonly CustomEditionVocabularyRow[] = [],
): EditionVocabularyOption[] {
  const customOptions = custom.map((row) => ({
    label: row.label,
    value: row.value,
  }))
  const builtinsWithoutOther = BUILTIN_BY_KIND[kind].filter((option) => option.value !== ADD_NEW_VALUE)
  const other = BUILTIN_BY_KIND[kind].find((option) => option.value === ADD_NEW_VALUE)
  return [...builtinsWithoutOther, ...customOptions, ...(other ? [other] : [])]
}

export async function listEditionVocabularyOptions(
  payload: Payload,
  kind: EditionVocabularyKind,
): Promise<EditionVocabularyOption[]> {
  const custom = await getCustomEditionVocabulary(payload, kind)
  return buildEditionVocabularyOptions(kind, custom)
}

export function isAllowedEditionVocabularyValue(
  kind: EditionVocabularyKind,
  value: string,
  customValues: readonly string[] = [],
): boolean {
  if (value === ADD_NEW_VALUE) return false
  return builtinValues(kind).has(value) || customValues.includes(value)
}

export async function registerCustomEditionVocabulary(
  payload: Payload,
  kind: EditionVocabularyKind,
  label: string,
): Promise<{ value: string; label: string; created: boolean }> {
  const trimmed = label.trim()
  if (!trimmed) {
    throw new Error('Label is required.')
  }

  const value = vocabularyValueFromLabel(trimmed, kind)
  const existing = await getCustomEditionVocabulary(payload, kind)
  const match = existing.find(
    (row) => row.value === value || row.label.toLowerCase() === trimmed.toLowerCase(),
  )
  if (match) {
    return { value: match.value, label: match.label, created: false }
  }

  const fieldName = GLOBAL_FIELD_BY_KIND[kind]
  const next = [...existing, { value, label: trimmed }].sort((a, b) =>
    a.label.localeCompare(b.label),
  )

  await payload.updateGlobal({
    slug: ART_OFFICIAL_SETTINGS_SLUG,
    data: { [fieldName]: next },
    overrideAccess: true,
  })

  return { value, label: trimmed, created: true }
}

export async function buildEditionVocabularyLabelMap(
  payload: Payload,
  kind: EditionVocabularyKind,
): Promise<Record<string, string>> {
  const options = await listEditionVocabularyOptions(payload, kind)
  return Object.fromEntries(
    options
      .filter((option) => option.value !== ADD_NEW_VALUE)
      .map((option) => [option.value, option.label]),
  )
}

function createEditionVocabularyValidator(
  kind: EditionVocabularyKind,
): Validate<string, unknown, unknown, TextField> {
  return async (value, { required, req }) => {
    const t = req.t
    if (value === undefined || value === null || value === '') {
      return required ? t('validation:required') : true
    }
    if (typeof value !== 'string') {
      return t('validation:invalidSelection')
    }
    const custom = req.payload ? await getCustomEditionVocabulary(req.payload, kind) : []
    if (isAllowedEditionVocabularyValue(kind, value, custom.map((row) => row.value))) {
      return true
    }
    return t('validation:invalidSelection')
  }
}

export const validateEditionSubstrate = createEditionVocabularyValidator('substrate')
export const validateEditionPrintTechnique = createEditionVocabularyValidator('printTechnique')

export const EDITION_VOCABULARY_ADD_NEW_VALUE = ADD_NEW_VALUE

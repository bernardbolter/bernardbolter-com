import { normalizeMegacitiesSelectFields } from './normalizeMegacitiesSelects'

/** Payload `artworks` select values — keep in sync with Artworks.ts. */
export const ARTWORK_MEDIUM_VALUES = [
  'acrylic-photo-transfer-on-canvas',
  'acrylic-on-canvas',
  'mixed-media-on-canvas',
  'photo-collage',
  'video',
  'digital',
  'other',
] as const

export const ARTWORK_CONDITION_VALUES = ['excellent', 'good', 'fair', 'poor'] as const

export const ARTWORK_SUPPORT_VALUES = [
  'canvas',
  'paper',
  'board',
  'screen',
  'file',
  'other',
] as const

export const ARTWORK_FRAMING_VALUES = ['framed', 'unframed', 'artist-framed'] as const

export const ARTWORK_MEASUREMENT_TYPE_VALUES = ['physical', 'digital', 'time-based'] as const

export const ARTWORK_AVAILABILITY_STATUS_VALUES = [
  'available',
  'sold',
  'not-for-sale',
  'on-loan',
  'reserved',
  'on-consignment',
] as const

type SelectOption = { label: string; value: string }

function buildLabelMap(options: SelectOption[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const { label, value } of options) {
    map[value] = value
    map[value.toLowerCase()] = value
    map[label.toLowerCase()] = value
  }
  return map
}

const MEDIUM_LABEL_MAP = buildLabelMap([
  { label: 'Acrylic photo transfer on canvas', value: 'acrylic-photo-transfer-on-canvas' },
  { label: 'Acrylic on canvas', value: 'acrylic-on-canvas' },
  { label: 'Mixed media on canvas', value: 'mixed-media-on-canvas' },
  { label: 'Photo collage', value: 'photo-collage' },
  { label: 'Video', value: 'video' },
  { label: 'Digital', value: 'digital' },
  { label: 'Other', value: 'other' },
])

const CONDITION_LABEL_MAP = buildLabelMap([
  { label: 'Excellent', value: 'excellent' },
  { label: 'Good', value: 'good' },
  { label: 'Fair', value: 'fair' },
  { label: 'Poor', value: 'poor' },
])

const SUPPORT_LABEL_MAP = buildLabelMap([
  { label: 'Canvas', value: 'canvas' },
  { label: 'Paper', value: 'paper' },
  { label: 'Board', value: 'board' },
  { label: 'Screen', value: 'screen' },
  { label: 'File', value: 'file' },
  { label: 'Other', value: 'other' },
])

const FRAMING_LABEL_MAP = buildLabelMap([
  { label: 'Framed', value: 'framed' },
  { label: 'Unframed', value: 'unframed' },
  { label: 'Artist framed', value: 'artist-framed' },
])

const MEASUREMENT_TYPE_LABEL_MAP = buildLabelMap([
  { label: 'Physical', value: 'physical' },
  { label: 'Digital', value: 'digital' },
  { label: 'Time-based', value: 'time-based' },
])

const AVAILABILITY_STATUS_LABEL_MAP = buildLabelMap([
  { label: 'Available', value: 'available' },
  { label: 'Sold', value: 'sold' },
  { label: 'Not for sale', value: 'not-for-sale' },
  { label: 'On loan', value: 'on-loan' },
  { label: 'Reserved', value: 'reserved' },
  { label: 'On consignment', value: 'on-consignment' },
])

/** Agent / legacy phrasing that does not match Payload option values exactly. */
const AVAILABILITY_STATUS_ALIASES: Record<string, string> = {
  'for-sale': 'available',
  forsale: 'available',
}

/** Agent phrasing for print substrate / mount — maps to Payload support select. */
const SUPPORT_ALIASES: Record<string, string> = {
  aluminum: 'board',
  aluminium: 'board',
  'aluminum-mount': 'board',
  'aluminium-mount': 'board',
  'aluminum mount': 'board',
  'aluminium mount': 'board',
  'metal mount': 'board',
  'metal panel': 'board',
  'dibond': 'board',
}

/** Agent phrasing for DCS and digital prints — maps to Payload medium select. */
const MEDIUM_ALIASES: Record<string, string> = {
  'digital composite': 'digital',
  'digital print': 'digital',
  'composite city portrait': 'digital',
  'composite city portraits': 'digital',
  'digital photography': 'digital',
  'digital collage': 'digital',
}

export type NormalizeArtworkContext = {
  seriesSlug?: string | null
  /** Custom medium values from art-official-settings global */
  extraMediumValues?: readonly string[]
}

function resolveSupportValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const raw = value.trim()
  if (!raw) return undefined

  const alias = SUPPORT_ALIASES[raw.toLowerCase()] ?? SUPPORT_ALIASES[slugifySelectInput(raw)]
  if (alias) return alias

  return normalizeSelectValue(raw, ARTWORK_SUPPORT_VALUES, SUPPORT_LABEL_MAP)
}

function resolveMediumValue(
  value: unknown,
  extraAllowed: readonly string[] = [],
): string | undefined {
  if (typeof value !== 'string') return undefined
  const raw = value.trim()
  if (!raw) return undefined

  const alias = MEDIUM_ALIASES[raw.toLowerCase()] ?? MEDIUM_ALIASES[slugifySelectInput(raw)]
  if (alias) return alias

  const allowed = [...ARTWORK_MEDIUM_VALUES, ...extraAllowed]
  return normalizeSelectValue(raw, allowed, MEDIUM_LABEL_MAP)
}

function slugifySelectInput(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeSelectValue(
  value: unknown,
  allowed: readonly string[],
  labelMap: Record<string, string>,
): string | undefined {
  if (typeof value !== 'string') return undefined
  const raw = value.trim()
  if (!raw) return undefined

  if (allowed.includes(raw)) return raw

  const lower = raw.toLowerCase()
  if (allowed.includes(lower)) return lower

  const fromLabel = labelMap[lower] ?? labelMap[raw]
  if (fromLabel && allowed.includes(fromLabel)) return fromLabel

  const slug = slugifySelectInput(raw)
  if (allowed.includes(slug)) return slug

  // Common agent phrasing: "excellent condition", "acrylic transfer"
  for (const option of allowed) {
    if (lower.includes(option.replace(/-/g, ' ')) || lower.includes(option)) {
      return option
    }
  }

  return undefined
}

function normalizeAvailabilityStatus(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const raw = value.trim()
  if (!raw) return undefined

  const alias = AVAILABILITY_STATUS_ALIASES[raw.toLowerCase()] ?? AVAILABILITY_STATUS_ALIASES[slugifySelectInput(raw)]
  if (alias) return alias

  return normalizeSelectValue(
    raw,
    ARTWORK_AVAILABILITY_STATUS_VALUES,
    AVAILABILITY_STATUS_LABEL_MAP,
  )
}

function normalizeMeasurementType(value: unknown): string[] | undefined {
  const allowed = ARTWORK_MEASUREMENT_TYPE_VALUES as readonly string[]
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => normalizeSelectValue(item, allowed, MEASUREMENT_TYPE_LABEL_MAP))
      .filter((item): item is string => Boolean(item))
    return normalized.length > 0 ? [...new Set(normalized)] : undefined
  }
  const single = normalizeSelectValue(value, allowed, MEASUREMENT_TYPE_LABEL_MAP)
  return single ? [single] : undefined
}

/**
 * Map agent-staged labels to Payload select values; drop invalid optional fields.
 */
export function normalizeArtworkSelectFields(
  patch: Record<string, unknown>,
  ctx: NormalizeArtworkContext = {},
): Record<string, unknown> {
  const out = { ...patch }
  const seriesSlug =
    typeof ctx.seriesSlug === 'string' && ctx.seriesSlug.trim()
      ? ctx.seriesSlug.trim()
      : typeof out.seriesSlug === 'string' && out.seriesSlug.trim()
        ? out.seriesSlug.trim()
        : undefined

  const medium = resolveMediumValue(out.medium, ctx.extraMediumValues ?? [])
  if (medium) out.medium = medium
  else if (out.medium != null && out.medium !== '') {
    delete out.medium
  }

  const condition = normalizeSelectValue(
    out.condition,
    ARTWORK_CONDITION_VALUES,
    CONDITION_LABEL_MAP,
  )
  if (condition) out.condition = condition
  else delete out.condition

  const support = resolveSupportValue(out.support)
  if (support) out.support = support
  else if (out.support != null && out.support !== '') delete out.support

  const framing = normalizeSelectValue(out.framing, ARTWORK_FRAMING_VALUES, FRAMING_LABEL_MAP)
  if (framing) out.framing = framing
  else if (out.framing != null && out.framing !== '') delete out.framing

  const measurementType = normalizeMeasurementType(out.measurementType)
  if (measurementType) out.measurementType = measurementType

  const availabilityStatus = normalizeAvailabilityStatus(out.availabilityStatus)
  if (availabilityStatus) out.availabilityStatus = availabilityStatus
  else if (out.availabilityStatus != null && out.availabilityStatus !== '') {
    delete out.availabilityStatus
  }

  // Required on create — sensible defaults when the agent used prose labels we could not map
  if (!out.medium || typeof out.medium !== 'string') {
    if (seriesSlug === 'a-colorful-history') {
      out.medium = 'acrylic-photo-transfer-on-canvas'
    } else if (seriesSlug === 'digital-city-series') {
      out.medium = 'digital'
    } else if (seriesSlug === 'megacities') {
      out.medium = 'photo-collage'
    } else {
      out.medium = 'mixed-media-on-canvas'
    }
  }

  if (!Array.isArray(out.measurementType) || out.measurementType.length === 0) {
    out.measurementType =
      seriesSlug === 'digital-city-series' ||
      seriesSlug === 'megacities' ||
      out.medium === 'digital' ||
      out.medium === 'video'
        ? ['digital']
        : ['physical']
  }

  return normalizeMegacitiesSelectFields(out)
}

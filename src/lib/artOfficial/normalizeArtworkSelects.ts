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
export function normalizeArtworkSelectFields(patch: Record<string, unknown>): Record<string, unknown> {
  const out = { ...patch }

  const medium = normalizeSelectValue(
    out.medium,
    ARTWORK_MEDIUM_VALUES,
    MEDIUM_LABEL_MAP,
  )
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

  const support = normalizeSelectValue(out.support, ARTWORK_SUPPORT_VALUES, SUPPORT_LABEL_MAP)
  if (support) out.support = support
  else if (out.support != null && out.support !== '') delete out.support

  const framing = normalizeSelectValue(out.framing, ARTWORK_FRAMING_VALUES, FRAMING_LABEL_MAP)
  if (framing) out.framing = framing
  else if (out.framing != null && out.framing !== '') delete out.framing

  const measurementType = normalizeMeasurementType(out.measurementType)
  if (measurementType) out.measurementType = measurementType

  // Required on create — sensible defaults when the agent used prose labels we could not map
  if (!out.medium || typeof out.medium !== 'string') {
    const seriesSlug =
      typeof out.seriesSlug === 'string'
        ? out.seriesSlug
        : undefined
    out.medium =
      seriesSlug === 'a-colorful-history'
        ? 'acrylic-photo-transfer-on-canvas'
        : 'mixed-media-on-canvas'
  }

  if (!Array.isArray(out.measurementType) || out.measurementType.length === 0) {
    out.measurementType = ['physical']
  }

  return out
}

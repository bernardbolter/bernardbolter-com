/**
 * Pre-staging enum validation (sessions-audit-cursor-spec Part 3b).
 * Options mirror live Artworks schema — reject before presenting as staged.
 */

export const ARTWORK_SELECT_OPTIONS: Record<string, readonly string[]> = {
  availabilityStatus: [
    'available',
    'sold',
    'not-for-sale',
    'on-loan',
    'reserved',
    'on-consignment',
  ],
  dimensionUnit: ['cm', 'in'],
  'currentLocation.category': [
    'artists-studio',
    'private-collection',
    'institution',
    'on-loan',
  ],
  sizeTier: ['xs', 'sm', 'md', 'lg', 'xl'],
  reasoningStatus: ['stub', 'partial', 'complete'],
  hasEditions: ['none', 'open', 'limited'],
  orientation: ['landscape', 'portrait', 'square'],
}

export const DESCRIPTION_SHORT_MAX = 400

/** Validate a select/enum field value against known schema options. */
export function validateSelectFieldValue(
  field: string,
  value: unknown,
): { ok: true } | { ok: false; error: string; allowed: readonly string[] } {
  const allowed = ARTWORK_SELECT_OPTIONS[field]
  if (!allowed) return { ok: true }

  let candidate: string | null = null
  if (typeof value === 'string') candidate = value.trim()
  else if (value && typeof value === 'object' && 'category' in value && field === 'currentLocation') {
    const cat = (value as { category?: unknown }).category
    if (typeof cat === 'string') {
      return validateSelectFieldValue('currentLocation.category', cat)
    }
  }

  if (candidate == null) {
    return {
      ok: false,
      error: `${field} must be one of: ${allowed.join(' | ')}`,
      allowed,
    }
  }

  if (!allowed.includes(candidate)) {
    return {
      ok: false,
      error: `Invalid ${field} value "${candidate}". Allowed: ${allowed.join(' | ')}`,
      allowed,
    }
  }
  return { ok: true }
}

/** Truncate descriptionShort to schema maxLength, preferring sentence boundary. */
export function clampDescriptionShort(text: string, max = DESCRIPTION_SHORT_MAX): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  const slice = trimmed.slice(0, max)
  const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '))
  if (lastStop >= Math.floor(max * 0.6)) {
    return slice.slice(0, lastStop + 1).trim()
  }
  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace >= Math.floor(max * 0.6)) {
    return `${slice.slice(0, lastSpace).trim()}…`
  }
  return `${slice.trim()}…`
}

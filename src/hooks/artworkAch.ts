import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook } from 'payload'

/**
 * City → placeholder color mapping, per
 * handoff-ach-schema-extension.md Part 2 Group 1 (`cityPlaceholderColor`).
 *
 * Match is case/whitespace-insensitive against the base Artwork `city` field.
 * Fallback `#F4F2EE` when the city does not resolve.
 */
const CITY_PLACEHOLDER_COLORS: Array<{ match: RegExp; hex: string }> = [
  { match: /berlin/i, hex: '#A8D6E8' },
  { match: /san\s*francisco/i, hex: '#B8B8BC' },
  { match: /new\s*york/i, hex: '#B8B8BC' },
  { match: /munich|münchen/i, hex: '#F0E8C0' },
  { match: /amsterdam/i, hex: '#C4907A' },
]
const CITY_PLACEHOLDER_FALLBACK = '#F4F2EE'

function resolveCityPlaceholder(city: unknown): string {
  if (city == null || typeof city !== 'string') return CITY_PLACEHOLDER_FALLBACK
  const trimmed = city.trim()
  if (!trimmed) return CITY_PLACEHOLDER_FALLBACK
  for (const { match, hex } of CITY_PLACEHOLDER_COLORS) {
    if (match.test(trimmed)) return hex
  }
  return CITY_PLACEHOLDER_FALLBACK
}

/**
 * Extract the earliest 4-digit year from a free-form date string such as
 * "c. 1861", "1895–1900", or "1861-08-22". Returns null when no year is found.
 */
export function parseApproximateDateYear(input: unknown): number | null {
  if (typeof input !== 'string') return null
  const matches = input.match(/(\d{4})/g)
  if (!matches || matches.length === 0) return null
  const years = matches
    .map((m) => parseInt(m, 10))
    .filter((y) => Number.isFinite(y) && y >= 1 && y <= 9999)
  if (years.length === 0) return null
  return Math.min(...years)
}

/**
 * Assemble the human-readable `sourceCredit` string from structured source-photograph
 * fields, per Part 2 Group 3 spec:
 *   "[Creator], [Title], [Date]. [Institution]. [License]."
 *
 * Any missing piece is silently dropped; result is null if nothing is available.
 */
export function buildSourceCredit(source: Record<string, unknown> | null | undefined): string | null {
  if (!source) return null
  const creator = typeof source.sourceCreator === 'string' ? source.sourceCreator.trim() : ''
  const title = typeof source.sourceTitle === 'string'
    ? source.sourceTitle.trim()
    : (() => {
        const t = source.sourceTitle
        if (t && typeof t === 'object') {
          const en = (t as Record<string, unknown>).en
          if (typeof en === 'string') return en.trim()
        }
        return ''
      })()
  const date = typeof source.approximateDate === 'string' ? source.approximateDate.trim() : ''
  const institution = typeof source.sourceInstitution === 'string'
    ? source.sourceInstitution.trim()
    : ''
  const license = typeof source.sourceLicense === 'string' ? source.sourceLicense.trim() : ''

  const head = [creator, title, date].filter(Boolean).join(', ')
  const tail = [institution, license].filter(Boolean).join('. ')

  if (!head && !tail) return null
  if (head && !tail) return `${head}.`
  if (!head && tail) return `${tail}.`
  return `${head}. ${tail}.`
}

/**
 * Combined ACH `beforeChange` hook. Mutates the `ach.*` sub-tree in place:
 *
 * - `ach.mapAndTour.cityPlaceholderColor` is computed from the base `city` field
 *   (always overwritten — read-only in the admin UI).
 * - `ach.sourcePhotograph.approximateDateYear` is parsed from
 *   `ach.sourcePhotograph.approximateDate`.
 * - `ach.sourcePhotograph.sourceCredit` is assembled from structured source fields.
 * - `ach.ar.arButtonColors` is pre-filled from `ach.overlay.overlayColors` when not
 *   set explicitly (Bernard can reorder afterwards).
 */
export const artworkAchBeforeChange: CollectionBeforeChangeHook = ({ data }) => {
  if (!data) return data
  const d = data as Record<string, unknown>

  const ach = (d.ach as Record<string, unknown> | undefined) ?? {}

  // Group 1 — placeholder color
  const mapAndTour = (ach.mapAndTour as Record<string, unknown> | undefined) ?? {}
  mapAndTour.cityPlaceholderColor = resolveCityPlaceholder(d.city)
  ach.mapAndTour = mapAndTour

  // Group 3 — approximate date year + source credit
  const source = (ach.sourcePhotograph as Record<string, unknown> | undefined) ?? {}
  const parsedYear = parseApproximateDateYear(source.approximateDate)
  if (parsedYear != null) {
    source.approximateDateYear = parsedYear
  } else if (source.approximateDateYear == null) {
    source.approximateDateYear = null
  }
  source.sourceCredit = buildSourceCredit(source)
  ach.sourcePhotograph = source

  // Group 6 — sync arButtonColors from overlayColors when empty
  const overlay = (ach.overlay as Record<string, unknown> | undefined) ?? {}
  const overlayColorsRaw = overlay.overlayColors
  const ar = (ach.ar as Record<string, unknown> | undefined) ?? {}
  const existingButtons = ar.arButtonColors
  const hasButtons = Array.isArray(existingButtons) && existingButtons.length > 0
  if (!hasButtons && Array.isArray(overlayColorsRaw) && overlayColorsRaw.length === 3) {
    ar.arButtonColors = overlayColorsRaw.map((entry) => {
      if (entry && typeof entry === 'object' && 'hex' in entry) {
        return { hex: (entry as Record<string, unknown>).hex }
      }
      return entry
    })
  }
  ach.ar = ar

  d.ach = ach
  return data
}

/**
 * Validate hook that prevents publishing an AR experience without a marker file,
 * per Part 2 Group 6 spec and the Part 6.8 "What NOT to do" rule:
 *   "Do not set arEnabled: true unless arMarkerFile is uploaded."
 */
export const artworkAchValidateAr: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data
  const ach = (data.ach as Record<string, unknown> | undefined) ?? {}
  const ar = (ach.ar as Record<string, unknown> | undefined) ?? {}
  if (ar.arEnabled === true && !ar.arMarkerFile) {
    throw new Error(
      'ACH AR Experience: arEnabled cannot be true without an arMarkerFile uploaded.',
    )
  }
  return data
}

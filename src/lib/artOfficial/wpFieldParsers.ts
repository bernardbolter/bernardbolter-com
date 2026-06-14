import type { WordpressImportEntry } from './wordpressImport.shared'

export type ParsedWpDimension = {
  whole: number
  fraction?: string
  unit: 'cm' | 'in'
}

const FRACTION_IN_VALUE = /(\d+)\s+(\d+\s*\/\s*\d+)/

/** Parse a WP width/height string into whole (+ optional fraction) and unit. */
export function parseWpDimension(
  value: unknown,
  units?: string | string[] | null,
): ParsedWpDimension | null {
  if (value == null) return null
  const raw = String(value).trim()
  if (!raw) return null

  const unitHint = Array.isArray(units) ? units[0] : units
  const hint = unitHint?.toLowerCase() ?? ''
  const hasInchMark = raw.includes('"') || /\bin(?:ch(?:es)?)?\b/i.test(raw)
  const hasCmMark = /\bcm\b/i.test(raw)
  const unit: 'cm' | 'in' =
    hasInchMark ? 'in'
    : hasCmMark ? 'cm'
    : hint.includes('imperial') || hint === 'inh' ? 'in'
    : hint.includes('metric') || hint === 'cmt' || hint === 'cm' ? 'cm'
    : hasInchMark ? 'in'
    : 'cm'

  const fractionMatch = raw.match(FRACTION_IN_VALUE)
  if (fractionMatch) {
    const whole = Number.parseInt(fractionMatch[1], 10)
    const fraction = fractionMatch[2].replace(/\s+/g, '')
    if (!Number.isFinite(whole) || whole < 0) return null
    return { whole, fraction, unit }
  }

  const numMatch = raw.match(/[\d.]+/)
  if (!numMatch) return null
  const quantity = Number.parseFloat(numMatch[0].replace(',', '.'))
  if (!Number.isFinite(quantity) || quantity <= 0) return null

  const whole = Math.floor(quantity)
  const remainder = quantity - whole
  if (remainder > 0.0001 && unit === 'in') {
    const denom = 16
    const num = Math.round(remainder * denom)
    if (num > 0 && num < denom) {
      return { whole, fraction: `${num}/${denom}`, unit }
    }
  }

  return { whole, unit }
}

function parseCommaNumber(value: unknown): number | null {
  if (value == null) return null
  const raw = String(value).trim()
  if (!raw) return null
  const match = raw.match(/[\d,.]+/)
  if (!match) return null
  const n = Number.parseFloat(match[0].replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** "604.31 km2 (233.33 sq mi)" → 604.31 */
export function parseWpAreaKm2(value: unknown): number | null {
  if (value == null) return null
  const raw = String(value).trim()
  const kmMatch = raw.match(/([\d,.]+)\s*km/i)
  if (kmMatch) {
    const n = Number.parseFloat(kmMatch[1].replace(/,/g, ''))
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return parseCommaNumber(value)
}

/** "5,500/km2 (14,000/sq mi)" → 5500 */
export function parseWpDensityPerKm2(value: unknown): number | null {
  if (value == null) return null
  const raw = String(value).trim()
  const kmMatch = raw.match(/([\d,.]+)\s*\/\s*km/i)
  if (kmMatch) {
    const n = Number.parseFloat(kmMatch[1].replace(/,/g, ''))
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return parseCommaNumber(value)
}

/** "650 m (2,130 ft)" → 650 */
export function parseWpElevationM(value: unknown): number | null {
  if (value == null) return null
  const raw = String(value).trim()
  const mMatch = raw.match(/([\d,.]+)\s*m\b/i)
  if (mMatch) {
    const n = Number.parseFloat(mMatch[1].replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return parseCommaNumber(value)
}

/** "3,322,416" → 3322416 */
export function parseWpPopulation(value: unknown): number | null {
  if (value == null) return null
  const raw = String(value).trim().replace(/,/g, '')
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function basenameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const last = url.split('/').pop()
  if (!last) return null
  return last.replace(/\.[^.]+$/, '').toLowerCase()
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** Best-effort match of an uploaded filename to a legacy export row. */
export function matchWpImportEntryByFilename(
  filename: string,
  entries: WordpressImportEntry[],
  seriesSlug?: string | null,
): WordpressImportEntry | null {
  const base = filename.replace(/\.[^.]+$/, '').toLowerCase()
  if (!base) return null

  const candidates = seriesSlug
    ? entries.filter((e) => e.seriesSlug === seriesSlug)
    : entries

  for (const entry of candidates) {
    const urlBase = basenameFromUrl(entry.artworkImageUrl)
    if (urlBase) {
      if (base === urlBase) return entry
      const urlStem = urlBase.replace(/_lg$/, '').replace(/-composite$/, '')
      const fileStem = base.replace(/_lg$/, '').replace(/-composite$/, '')
      if (fileStem === urlStem || fileStem.includes(urlStem) || urlStem.includes(fileStem)) {
        return entry
      }
    }
  }

  for (const entry of candidates) {
    if (!entry.wpSlug) continue
    const slug = entry.wpSlug.toLowerCase()
    if (base === slug || base.includes(slug) || slug.includes(base)) return entry

    const slugCity = slug.split('-')[0]
    if (slugCity.length >= 4 && base.includes(slugCity)) return entry

    if (entry.city) {
      const cityToken = normalizeToken(entry.city)
      if (cityToken.length >= 4 && normalizeToken(base).includes(cityToken)) return entry
    }
  }

  return null
}

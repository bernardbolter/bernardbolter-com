import { ARTWORK_MEDIUM_VALUES } from './legacyFieldMapping'
import type { LegacyConflict, LegacyRecord, WpLegacyArtworkNode } from './legacyTypes'

/** Strip HTML tags and collapse whitespace. */
export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#039;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

/** "berlin-wall-1961" → "Berlin Wall 1961" */
export function slugDerivedTitle(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}

function parseOptionalNumber(value: string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

function parseYear(value: string | null | undefined): number | null {
  if (!value) return null
  const n = Number.parseInt(String(value).trim(), 10)
  return Number.isNaN(n) ? null : n
}

function wpTitlePlain(title: string | null | undefined): string | null {
  if (!title) return null
  const stripped = stripHtml(title)
  return stripped || null
}

function extractDateNotes(...texts: Array<string | null | undefined>): string[] {
  const notes: string[] = []
  const monthYear =
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}\b/gi
  const yearOnly = /\b(19|20)\d{2}\b/g

  for (const text of texts) {
    if (!text) continue
    for (const match of text.matchAll(monthYear)) {
      notes.push(match[0])
    }
    for (const match of text.matchAll(yearOnly)) {
      const y = match[0]
      if (!notes.some((n) => n.includes(y))) {
        notes.push(y)
      }
    }
  }

  return [...new Set(notes)]
}

function yearsFromDateNotes(notes: string[]): number[] {
  const years: number[] = []
  for (const note of notes) {
    const match = note.match(/\b(19|20)\d{2}\b/)
    if (match) {
      const y = Number.parseInt(match[0], 10)
      if (!Number.isNaN(y)) years.push(y)
    }
  }
  return years
}

function postDateYear(postDate: string | null): number | null {
  if (!postDate) return null
  const d = new Date(postDate)
  if (Number.isNaN(d.getTime())) return null
  return d.getUTCFullYear()
}

export function mediumMatchesPayloadEnum(mediumRaw: string | null): boolean {
  if (!mediumRaw?.trim()) return true
  const raw = mediumRaw.toLowerCase().trim()
  if ((ARTWORK_MEDIUM_VALUES as readonly string[]).includes(raw)) return true

  if (raw.includes('transfer')) return true
  if (raw.includes('collage')) return true
  if (raw.includes('video') || raw.includes('mp4')) return true
  if (raw.includes('digital')) return true
  if (raw.includes('mixed')) return true
  if (raw.includes('acrylic') && raw.includes('canvas')) return true

  return false
}

function resolveSeries(node: WpLegacyArtworkNode): string | null {
  const fromFields = node.artworkFields?.series?.[0]
  if (fromFields) return fromFields
  const fromCategory = node.categories?.nodes?.[0]?.slug
  return fromCategory ?? null
}

function resolveImageUrl(node: WpLegacyArtworkNode): string | null {
  return (
    node.featuredImage?.node?.sourceUrl ??
    node.artworkFields?.artworkImage?.node?.sourceUrl ??
    null
  )
}

function resolveDimensionUnit(
  units: string | string[] | null | undefined,
): 'cm' | 'in' | null {
  const raw = Array.isArray(units) ? units[0] : units
  if (!raw) return null
  const u = String(raw).toLowerCase()
  if (u.includes('metric') || u === 'cm') return 'cm'
  if (u.includes('imperial') || u === 'in' || u.includes('inch')) return 'in'
  return null
}

function firstString(value: string | string[] | null | undefined): string | null {
  if (value == null) return null
  if (Array.isArray(value)) return value[0]?.trim() || null
  return value.trim() || null
}

function resolveOrientation(
  orientation: string | string[] | null | undefined,
): string | null {
  if (!orientation) return null
  if (Array.isArray(orientation)) return orientation[0] ?? null
  return orientation
}

function detectConflicts(args: {
  titleCandidate: string | null
  slugDerived: string
  yearCandidate: number | null
  postDate: string | null
  dateNotes: string[]
  mediumRaw: string | null
  forSale: boolean | null
  priceRaw: string | null
  provenanceText: string | null
}): LegacyConflict[] {
  const conflicts: LegacyConflict[] = []

  if (!args.titleCandidate) {
    conflicts.push({
      type: 'missing-title',
      detail: `WordPress title is empty. Slug suggests "${args.slugDerived}" — confirm the actual title with the artist.`,
    })
  }

  const noteYears = yearsFromDateNotes(args.dateNotes)
  const postYear = postDateYear(args.postDate)
  const referenceYears = new Set<number>()
  if (args.yearCandidate != null) referenceYears.add(args.yearCandidate)
  if (postYear != null) referenceYears.add(postYear)

  for (const noteYear of noteYears) {
    if (referenceYears.size > 0 && !referenceYears.has(noteYear)) {
      conflicts.push({
        type: 'date-mismatch',
        detail: `Free-text date signal "${noteYear}" disagrees with year field (${args.yearCandidate ?? '—'}) or post date (${postYear ?? '—'}). Surface both — do not pick one.`,
      })
      break
    }
  }

  if (!mediumMatchesPayloadEnum(args.mediumRaw)) {
    conflicts.push({
      type: 'medium-unmatched',
      detail: `Medium "${args.mediumRaw}" does not map cleanly to the Payload medium select — confirm and use mediumOther if needed.`,
    })
  }

  if (args.forSale || args.priceRaw || args.provenanceText) {
    conflicts.push({
      type: 'dormant-field-present',
      detail:
        'Legacy record includes commerce or provenance data. Hold as reference only — do not stage at studio career stage.',
    })
  }

  return conflicts
}

/** Normalise one raw WP node into the lookup shape. Pure — no I/O. */
export function normalizeLegacyRecord(node: WpLegacyArtworkNode): LegacyRecord | null {
  const legacyRecordId = node.databaseId
  const legacySlug = node.slug?.trim()
  if (legacyRecordId == null || !legacySlug) return null

  const f = node.artworkFields ?? {}
  const titleCandidate = wpTitlePlain(node.title)
  const derived = slugDerivedTitle(legacySlug)

  const locationText = stripHtml(f.location)
  const exhibitionHistoryText = stripHtml(f.exhibitionHistory)
  const provenanceText = stripHtml(f.provenance)
  const printEditionsText = stripHtml(f.printEditions)

  const dateNotes = extractDateNotes(locationText, exhibitionHistoryText, provenanceText)
  const yearCandidate = parseYear(f.year)
  const postDate = node.date ?? null

  const forSale = f.forsale ?? null
  const priceRaw = f.price?.trim() ? String(f.price).trim() : null

  const conflicts = detectConflicts({
    titleCandidate,
    slugDerived: derived,
    yearCandidate,
    postDate,
    dateNotes,
    mediumRaw: f.medium ?? null,
    forSale,
    priceRaw,
    provenanceText,
  })

  return {
    legacyRecordId,
    legacySlug,
    titleCandidate,
    slugDerivedTitle: derived,
    yearCandidate,
    postDate,
    dateNotes,
    series: resolveSeries(node),
    city: f.city?.trim() || null,
    country: f.country?.trim() || null,
    lat: parseOptionalNumber(f.lat),
    lng: parseOptionalNumber(f.lng),
    mediumRaw: f.medium?.trim() || null,
    dimensionUnit: resolveDimensionUnit(f.units),
    width: parseOptionalNumber(f.width),
    height: parseOptionalNumber(f.height),
    sizeTier: firstString(f.size),
    orientation: resolveOrientation(f.orientation),
    imageUrl: resolveImageUrl(node),
    exhibitionHistoryText,
    provenanceText,
    printEditionsText,
    locationText,
    forSale,
    priceRaw,
    conflicts,
  }
}

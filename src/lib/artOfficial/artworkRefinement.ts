import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { ARTWORK_FIELD_CATALOG } from './fieldCatalog'
import { lexicalToPlain } from './lexicalToPlain'

type ArtworkRefinementContext = {
  payload: Payload
  user: User
  artworkId: number
}

function isBlank(val: unknown): boolean {
  if (val == null) return true
  if (typeof val === 'string') return val.trim() === ''
  if (typeof val === 'boolean') return false
  if (typeof val === 'number') return false
  if (Array.isArray(val)) return val.length === 0
  if (typeof val === 'object') {
    return Object.values(val as Record<string, unknown>).every(isBlank)
  }
  return false
}

function formatFieldValue(field: string, val: unknown): string {
  if (typeof val === 'string') return val.length > 120 ? `${val.slice(0, 120)}…` : val
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (Array.isArray(val)) {
    if (val.length === 0) return '(empty)'
    if (val.length <= 3) return val.map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v))).join(', ')
    return `[${val.length} items]`
  }
  if (typeof val === 'object' && val !== null) {
    const entries = Object.entries(val as Record<string, unknown>)
      .filter(([, v]) => !isBlank(v))
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? (v.length > 60 ? v.slice(0, 60) + '…' : v) : String(v)}`)
    return entries.length ? `{ ${entries.join(', ')} }` : '(empty object)'
  }
  return String(val)
}

/** Load an existing artwork and build a prompt block summarising filled fields and coverage gaps. */
export async function buildArtworkRefinementBlock(
  ctx: ArtworkRefinementContext,
): Promise<string> {
  const { payload, user, artworkId } = ctx

  let artwork: Record<string, unknown>
  try {
    artwork = (await payload.findByID({
      collection: 'artworks',
      id: artworkId,
      depth: 1,
      overrideAccess: false,
      user,
      locale: 'en',
    })) as unknown as Record<string, unknown>
  } catch {
    return `REFINEMENT CONTEXT\n\nCould not load artwork #${artworkId} — it may have been deleted.`
  }

  const title = typeof artwork.title === 'string' ? artwork.title : '(untitled)'
  const slug = typeof artwork.slug === 'string' ? artwork.slug : String(artworkId)
  const year = artwork.yearCreated ?? ''

  const catalogFields = new Set(ARTWORK_FIELD_CATALOG.map((f) => f.field))

  const filled: string[] = []
  const missing: string[] = []

  for (const entry of ARTWORK_FIELD_CATALOG) {
    if (entry.layer === 'automatic' && entry.category === 'automatic') continue
    if (['slug', 'aspectRatio', 'clipEmbedding', 'analysisModelVersion', 'dominantColors', 'paintedFieldColors'].includes(entry.field)) continue

    const val = artwork[entry.field]
    // Try rich text fields via lexical
    const effectiveVal = val && typeof val === 'object' && !Array.isArray(val) && 'root' in (val as object)
      ? lexicalToPlain(val) || val
      : val

    if (isBlank(effectiveVal)) {
      missing.push(entry.field)
    } else {
      filled.push(`${entry.field}: ${formatFieldValue(entry.field, effectiveVal)}`)
    }
  }

  // Also check ACH group if this is an ACH work
  const series = typeof artwork.series === 'object' && artwork.series !== null
    ? (artwork.series as { slug?: string }).slug ?? ''
    : ''
  const isAch = series === 'a-colorful-history'
  let achGaps: string[] = []
  if (isAch) {
    const ach = (artwork.ach ?? {}) as Record<string, unknown>
    const achChecks: Array<[string, unknown]> = [
      ['ach.internalGroupTitle', ach.internalGroupTitle],
      ['ach.overlay.overlayColors', (ach.overlay as Record<string, unknown> | undefined)?.overlayColors],
      ['ach.sourcePhotograph.sourceCreator', (ach.sourcePhotograph as Record<string, unknown> | undefined)?.sourceCreator],
      ['ach.location.locationWikidataUri', (ach.location as Record<string, unknown> | undefined)?.locationWikidataUri],
      ['ach.location.locationTGNUri', (ach.location as Record<string, unknown> | undefined)?.locationTGNUri],
      ['ach.location.keyHistoricalDates', (ach.location as Record<string, unknown> | undefined)?.keyHistoricalDates],
      ['ach.mapAndTour.lat', (ach.mapAndTour as Record<string, unknown> | undefined)?.lat],
    ]
    for (const [path, val] of achChecks) {
      if (isBlank(val)) achGaps.push(path)
    }
  }

  const lines: string[] = [
    `REFINEMENT CONTEXT — updating existing artwork`,
    ``,
    `Artwork: "${title}${year ? `, ${year}` : ''}" (slug: ${slug}, id: ${artworkId})`,
    typeof artwork.series === 'object' && artwork.series !== null
      ? `Series: ${(artwork.series as { slug?: string }).slug ?? 'unknown'}`
      : '',
    ``,
    `ALREADY FILLED (do not re-ask unless the artist wants to correct a value):`,
    ...filled.map((f) => `  • ${f}`),
    ``,
    `MISSING / EMPTY (focus on these in priority order):`,
    ...missing.map((f) => `  • ${f}`),
  ]

  if (isAch && achGaps.length) {
    lines.push(``, `A COLORFUL HISTORY GAPS:`)
    achGaps.forEach((g) => lines.push(`  • ${g}`))
  }

  lines.push(
    ``,
    `INSTRUCTIONS`,
    `- Open with a brief summary of what's captured and what still needs attention.`,
    `- Do NOT ask about fields already marked ALREADY FILLED unless the artist raises them.`,
    `- Lead with the most important missing conceptual fields (intent, seriesContext, materialAndProcessMeaning) before practical gaps.`,
    `- This is a refinement — keep it focused and efficient. Aim for the gaps, not a full re-interview.`,
    `- Use update_field with targetCollection "artworks" to stage new or corrected values. Commit applies as an update to the existing record.`,
  )

  return lines.filter((l) => l !== null).join('\n')
}

import type { Artist, Event } from '@/payload-types'

import { cvRowFromEvent, cvRowPlainText, type CvRowModel } from '@/lib/cv/cvRowModel'

/** §2.10 standard section order (education first; selected collections from Artist, not Events). */
export const CV_SECTION_ORDER = [
  'education',
  'solo-exhibitions',
  'group-exhibitions',
  'art-fairs',
  'awards-prizes',
  'residencies',
  'public-commissions',
  'publications',
  'bibliography',
  'selected-collections',
  'talks-panels',
  'screenings',
  'performances',
  'other',
] as const

export type CvSectionSlug = (typeof CV_SECTION_ORDER)[number]

const SECTION_HEADING: Record<CvSectionSlug, string> = {
  education: 'Education',
  'solo-exhibitions': 'Solo exhibitions',
  'group-exhibitions': 'Group exhibitions',
  'art-fairs': 'Art fairs',
  'awards-prizes': 'Awards & prizes',
  residencies: 'Residencies',
  'public-commissions': 'Public commissions',
  publications: 'Publications',
  bibliography: 'Bibliography',
  'selected-collections': 'Selected collections',
  'talks-panels': 'Talks & panels',
  screenings: 'Screenings',
  performances: 'Performances',
  other: 'Other',
}

function defaultSectionFromEventType(event: Event): CvSectionSlug {
  switch (event.eventType) {
    case 'solo-exhibition':
      return 'solo-exhibitions'
    case 'group-exhibition':
      return 'group-exhibitions'
    case 'art-fair':
      return 'art-fairs'
    case 'residency':
      return 'residencies'
    case 'award':
      return 'awards-prizes'
    case 'publication':
      return 'publications'
    case 'bibliography':
      return 'bibliography'
    case 'public-commission':
      return 'public-commissions'
    case 'talk-panel':
      return 'talks-panels'
    case 'screening':
      return 'screenings'
    case 'performance':
      return 'performances'
    case 'education':
      return 'education'
    default:
      return 'other'
  }
}

export function sectionForEvent(event: Event): CvSectionSlug {
  const raw = event.cvSection
  if (raw && CV_SECTION_ORDER.includes(raw as CvSectionSlug)) {
    return raw as CvSectionSlug
  }
  return defaultSectionFromEventType(event)
}

export type CvSectionBlock = {
  slug: CvSectionSlug
  heading: string
  items: Array<{
    id: number | string
    row: CvRowModel
    text: string
  }>
}

/** Re-export date helpers used by tests and JSON-LD builders. */
export { educationYearColumn, eventDisplayYear } from '@/lib/cv/cvRowModel'

export function cvSectionDisplayHeading(_slug: CvSectionSlug, fallback: string): string {
  return fallback
}

function selectedCollectionRows(
  artist: Artist | null | undefined,
): Array<{ id: string | number; row: CvRowModel; text: string }> {
  const rows = artist?.selectedCollections
  if (!Array.isArray(rows)) return []

  return rows
    .filter((r) => r && r.cvVisible !== false)
    .map((r, i) => {
      const institutionName = (r.institutionName ?? '').trim()
      const city = (r.city ?? '').trim()
      const row: CvRowModel = {
        kind: 'collection',
        id: `sc-${i}`,
        institutionName,
        city,
      }
      return {
        id: row.id,
        row,
        text: cvRowPlainText(row),
      }
    })
    .filter((x) => x.text.length > 0)
}

/** Group, sort (year DESC, cvPriority ASC), and order sections per spec. */
export function buildCvSections(events: Event[], artist?: Artist | null): CvSectionBlock[] {
  const bySection = new Map<CvSectionSlug, Event[]>()

  for (const event of events) {
    if (event.eventType === 'education' && event.cvVisible === false) continue
    const key = sectionForEvent(event)
    const list = bySection.get(key) ?? []
    list.push(event)
    bySection.set(key, list)
  }

  const yearOf = (ev: Event) =>
    ev.yearStart != null && !Number.isNaN(Number(ev.yearStart)) ?
      Number(ev.yearStart)
    : new Date(ev.startDate).getFullYear()

  for (const [, list] of bySection) {
    list.sort((a, b) => {
      const yb = yearOf(b)
      const ya = yearOf(a)
      if (yb !== ya) return yb - ya
      const pb = b.cvPriority ?? 5
      const pa = a.cvPriority ?? 5
      if (pa !== pb) return pa - pb
      const tb = (b.cvDisplayTitle ?? b.title).trim()
      const ta = (a.cvDisplayTitle ?? a.title).trim()
      return ta.localeCompare(tb, undefined, { sensitivity: 'base' })
    })
  }

  const blocks: CvSectionBlock[] = []
  for (const slug of CV_SECTION_ORDER) {
    if (slug === 'selected-collections') {
      const items = selectedCollectionRows(artist ?? null)
      if (!items.length) continue
      blocks.push({
        slug,
        heading: SECTION_HEADING[slug],
        items,
      })
      continue
    }

    const list = bySection.get(slug)
    if (!list?.length) continue
    blocks.push({
      slug,
      heading: SECTION_HEADING[slug],
      items: list.map((event) => {
        const row = cvRowFromEvent(slug, event)
        return {
          id: event.id,
          row,
          text: cvRowPlainText(row),
        }
      }),
    })
  }

  return blocks
}

/** @deprecated Use cvRowPlainText(row) — kept for callers that still pass formatted lines. */
export function formatCvLine(event: Event): string {
  const row = cvRowFromEvent(sectionForEvent(event), event)
  return cvRowPlainText(row)
}

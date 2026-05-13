import type { Event } from '@/payload-types'

/** §2.11 standard section order (solo first). */
export const CV_SECTION_ORDER = [
  'solo-exhibitions',
  'group-exhibitions',
  'art-fairs',
  'awards-prizes',
  'residencies',
  'public-commissions',
  'publications',
  'talks-panels',
  'screenings',
  'performances',
  'other',
] as const

export type CvSectionSlug = (typeof CV_SECTION_ORDER)[number]

const SECTION_HEADING: Record<CvSectionSlug, string> = {
  'solo-exhibitions': 'Solo exhibitions',
  'group-exhibitions': 'Group exhibitions',
  'art-fairs': 'Art fairs',
  'awards-prizes': 'Awards & prizes',
  residencies: 'Residencies',
  'public-commissions': 'Public commissions',
  publications: 'Publications',
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
    case 'public-commission':
      return 'public-commissions'
    case 'talk-panel':
      return 'talks-panels'
    case 'screening':
      return 'screenings'
    case 'performance':
      return 'performances'
    default:
      return 'other'
  }
}

function sectionForEvent(event: Event): CvSectionSlug {
  const raw = event.cvSection
  if (raw && CV_SECTION_ORDER.includes(raw as CvSectionSlug)) {
    return raw as CvSectionSlug
  }
  return defaultSectionFromEventType(event)
}

export function eventDisplayYear(event: Event): string {
  const y =
    event.yearStart != null && !Number.isNaN(Number(event.yearStart)) ?
      Number(event.yearStart)
    : new Date(event.startDate).getFullYear()
  if (event.isOngoing) {
    return `${y}–ongoing`
  }
  return String(y)
}

const AWARD_OUTCOME_LABEL: Record<NonNullable<Event['awardOutcome']>, string> = {
  winner: 'winner',
  shortlisted: 'shortlisted',
  nominated: 'nominated',
  'honourable-mention': 'honourable mention',
}

/**
 * §2.11 CV line formats (exhibitions, publications, awards, residencies;
 * other types follow the exhibition-style pattern).
 */
export function formatCvLine(event: Event): string {
  const year = eventDisplayYear(event)
  const displayTitle = (event.cvDisplayTitle ?? event.title).trim()

  if (event.eventType === 'publication') {
    const pubName = (event.publicationTitle ?? '').trim()
    const pages = (event.publicationPages ?? '').trim()
    let line = `${year} ‘${displayTitle}’ in ${pubName}`
    if (pages) {
      line += `, pp. ${pages}`
    }
    return line
  }

  if (event.eventType === 'award') {
    const org = (event.awardGrantingOrganisation ?? '').trim()
    let line = `${year} ${displayTitle}`
    if (org) {
      line += `, ${org}`
    }
    if (event.awardOutcome && event.awardOutcome !== 'winner') {
      line += ` (${AWARD_OUTCOME_LABEL[event.awardOutcome]})`
    }
    return line
  }

  if (event.eventType === 'residency') {
    const org = (event.residencyOrganisation ?? '').trim()
    const city = (event.venueCity ?? '').trim()
    const parts = [displayTitle, org, city].filter(Boolean)
    return `${year} ${parts.join(', ')}`
  }

  const venue = (event.venueName ?? '').trim()
  const city = (event.venueCity ?? '').trim()
  const place = [venue, city].filter(Boolean).join(', ')
  if (place) {
    return `${year} ${displayTitle} ${place}`
  }
  return `${year} ${displayTitle}`
}

export type CvSectionBlock = {
  slug: CvSectionSlug
  heading: string
  items: Array<{ id: number; text: string }>
}

/** Group, sort (year DESC, then cvPriority DESC), and order sections per §2.11. */
export function buildCvSections(events: Event[]): CvSectionBlock[] {
  const bySection = new Map<CvSectionSlug, Event[]>()

  for (const e of events) {
    const key = sectionForEvent(e)
    const list = bySection.get(key) ?? []
    list.push(e)
    bySection.set(key, list)
  }

  const yearOf = (e: Event) =>
    e.yearStart != null && !Number.isNaN(Number(e.yearStart)) ?
      Number(e.yearStart)
    : new Date(e.startDate).getFullYear()

  for (const [, list] of bySection) {
    list.sort((a, b) => {
      const yb = yearOf(b)
      const ya = yearOf(a)
      if (yb !== ya) return yb - ya
      const pb = b.cvPriority ?? 5
      const pa = a.cvPriority ?? 5
      if (pb !== pa) return pb - pa
      const tb = (b.cvDisplayTitle ?? b.title).trim()
      const ta = (a.cvDisplayTitle ?? a.title).trim()
      return ta.localeCompare(tb, undefined, { sensitivity: 'base' })
    })
  }

  const blocks: CvSectionBlock[] = []
  for (const slug of CV_SECTION_ORDER) {
    const list = bySection.get(slug)
    if (!list?.length) continue
    blocks.push({
      slug,
      heading: SECTION_HEADING[slug],
      items: list.map((ev) => ({ id: ev.id, text: formatCvLine(ev) })),
    })
  }

  return blocks
}

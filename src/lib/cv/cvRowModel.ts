import type { Event } from '@/payload-types'

export type CvSectionSlug =
  | 'education'
  | 'solo-exhibitions'
  | 'group-exhibitions'
  | 'art-fairs'
  | 'awards-prizes'
  | 'residencies'
  | 'public-commissions'
  | 'publications'
  | 'bibliography'
  | 'selected-collections'
  | 'talks-panels'
  | 'screenings'
  | 'performances'
  | 'other'

export function eventDisplayYear(event: Event): string {
  const y =
    event.yearStart != null && !Number.isNaN(Number(event.yearStart)) ?
      Number(event.yearStart)
    : new Date(event.startDate).getFullYear()
  return String(y)
}

/** Education year column: YEAR–YEAR or YEAR–ongoing. */
export function educationYearColumn(event: Event): string {
  const start =
    event.yearStart != null && !Number.isNaN(Number(event.yearStart)) ?
      Number(event.yearStart)
    : new Date(event.startDate).getFullYear()

  if (event.isOngoing) {
    return `${start}–ongoing`
  }

  if (event.endDate) {
    const end = new Date(event.endDate).getFullYear()
    if (!Number.isNaN(end) && end !== start) {
      return `${start}–${end}`
    }
  }

  return String(start)
}

export type CvRowModel =
  | {
      kind: 'education'
      id: number | string
      year: string
      degreeSubject: string
      institution: string
      city: string
      hasPage?: boolean
      slug?: string | null
    }
  | {
      kind: 'venue-title'
      id: number | string
      year: string
      title: string
      venue: string
      city: string
      hasPage?: boolean
      slug?: string | null
    }
  | {
      kind: 'publication'
      id: number | string
      year: string
      articleTitle: string
      publicationName: string
      hasPage?: boolean
      slug?: string | null
    }
  | {
      kind: 'bibliography'
      id: number | string
      year: string
      author: string
      title: string
      publicationName: string
      hasPage?: boolean
      slug?: string | null
    }
  | {
      kind: 'award'
      id: number | string
      year: string
      awardName: string
      organisation: string
      outcome?: Event['awardOutcome']
      hasPage?: boolean
      slug?: string | null
    }
  | {
      kind: 'collection'
      id: number | string
      institutionName: string
      city: string
    }

const VENUE_TITLE_SECTIONS = new Set<CvSectionSlug>([
  'solo-exhibitions',
  'group-exhibitions',
  'art-fairs',
  'talks-panels',
  'screenings',
  'performances',
  'residencies',
  'public-commissions',
  'other',
])

function displayTitle(event: Event): string {
  return (event.cvDisplayTitle ?? event.title).trim()
}

function educationDegreeSubject(event: Event): string {
  const degree = event.degree?.trim()
  const subject = event.subject?.trim()
  if (degree && subject) return `${degree}, ${subject}`
  return degree || subject || displayTitle(event)
}

function venueParts(event: Event): { venue: string; city: string } {
  return {
    venue: (event.venueName ?? event.residencyOrganisation ?? '').trim(),
    city: (event.venueCity ?? '').trim(),
  }
}

export function cvRowFromEvent(section: CvSectionSlug, event: Event): CvRowModel {
  const year = eventDisplayYear(event)
  const hasPage = Boolean(event.hasPage)
  const slug = event.slug

  if (section === 'education') {
    return {
      kind: 'education',
      id: event.id,
      year: educationYearColumn(event),
      degreeSubject: educationDegreeSubject(event),
      institution: (event.institution ?? event.venueName ?? '').trim(),
      city: (event.venueCity ?? '').trim(),
      hasPage,
      slug,
    }
  }

  if (section === 'publications') {
    return {
      kind: 'publication',
      id: event.id,
      year,
      articleTitle: displayTitle(event),
      publicationName: (event.publicationTitle ?? '').trim(),
      hasPage,
      slug,
    }
  }

  if (section === 'bibliography') {
    return {
      kind: 'bibliography',
      id: event.id,
      year,
      author: (event.bibliographyAuthor ?? '').trim(),
      title: displayTitle(event),
      publicationName: (event.publicationTitle ?? '').trim(),
      hasPage,
      slug,
    }
  }

  if (section === 'awards-prizes') {
    return {
      kind: 'award',
      id: event.id,
      year,
      awardName: displayTitle(event),
      organisation: (event.awardGrantingOrganisation ?? '').trim(),
      outcome: event.awardOutcome ?? undefined,
      hasPage,
      slug,
    }
  }

  if (VENUE_TITLE_SECTIONS.has(section)) {
    const { venue, city } = venueParts(event)
    return {
      kind: 'venue-title',
      id: event.id,
      year,
      title: displayTitle(event),
      venue,
      city,
      hasPage,
      slug,
    }
  }

  const { venue, city } = venueParts(event)
  return {
    kind: 'venue-title',
    id: event.id,
    year,
    title: displayTitle(event),
    venue,
    city,
    hasPage,
    slug,
  }
}

export function cvRowPlainText(row: CvRowModel): string {
  switch (row.kind) {
    case 'education': {
      const place = [row.institution, row.city].filter(Boolean).join(', ')
      return place ? `${row.year} ${row.degreeSubject} — ${place}` : `${row.year} ${row.degreeSubject}`
    }
    case 'venue-title': {
      const place = [row.venue, row.city].filter(Boolean).join(', ')
      return place ? `${row.year} ${row.title} — ${place}` : `${row.year} ${row.title}`
    }
    case 'publication':
      return row.publicationName ?
          `${row.year} ‘${row.articleTitle}’ in ${row.publicationName}`
        : `${row.year} ‘${row.articleTitle}’`
    case 'bibliography':
      return `${row.year} ${row.author}, ‘${row.title}’, ${row.publicationName}`.trim()
    case 'award': {
      let line = `${row.year} ${row.awardName}`
      if (row.organisation) line += `, ${row.organisation}`
      return line
    }
    case 'collection':
      return row.city ? `${row.institutionName}, ${row.city}` : row.institutionName
    default:
      return ''
  }
}

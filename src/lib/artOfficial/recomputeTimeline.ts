import type { Payload, Where } from 'payload'

import type { User } from '@/payload-types'

import { computeTimelineDates } from './computeTimelineDates'
import { formatDateDisplay } from './formatDateDisplay'
import type { DatedWork, DatePrecision } from './sequencing/types'
import { defaultDatePrecision } from './sequencing/types'

type RecomputeOptions = {
  seriesId?: number
  seriesSlug?: string
  user: User
}

function buildWhere(options: RecomputeOptions): Where {
  if (options.seriesId != null) {
    return { series: { equals: options.seriesId } }
  }
  if (options.seriesSlug != null) {
    return { seriesSlug: { equals: options.seriesSlug } }
  }
  return { sortIndex: { exists: true } }
}

function toDatedWork(
  doc: {
    id: number | string
    sortIndex?: number | null
    dateKnown?: string | null
    datePrecision?: string | null
    yearCreated?: number | null
    series?: number | { id?: number; yearStart?: number | null; yearEnd?: number | null } | null
  },
  seriesMeta: Map<number, { yearStart?: number | null; yearEnd?: number | null }>,
): DatedWork | null {
  if (doc.sortIndex == null || typeof doc.yearCreated !== 'number') return null

  let seriesYearStart: number | null = null
  let seriesYearEnd: number | null = null
  const seriesRef = doc.series
  const seriesId =
    typeof seriesRef === 'object' && seriesRef !== null
      ? seriesRef.id
      : typeof seriesRef === 'number'
        ? seriesRef
        : null

  if (typeof seriesRef === 'object' && seriesRef !== null) {
    seriesYearStart = seriesRef.yearStart ?? null
    seriesYearEnd = seriesRef.yearEnd ?? null
  } else if (seriesId != null) {
    const meta = seriesMeta.get(seriesId)
    seriesYearStart = meta?.yearStart ?? null
    seriesYearEnd = meta?.yearEnd ?? null
  }

  return {
    id: String(doc.id),
    sortIndex: doc.sortIndex,
    dateKnown: doc.dateKnown ? new Date(doc.dateKnown) : null,
    datePrecision: defaultDatePrecision(doc.datePrecision),
    yearCreated: doc.yearCreated,
    seriesYearStart,
    seriesYearEnd,
  }
}

export type RecomputeTimelineResult = {
  updated: number
  skipped: number
}

export async function recomputeTimeline(
  payload: Payload,
  options: RecomputeOptions,
): Promise<RecomputeTimelineResult> {
  const where = buildWhere(options)

  const { docs } = await payload.find({
    collection: 'artworks',
    where,
    limit: 2000,
    depth: 1,
    overrideAccess: false,
    user: options.user as never,
    select: {
      sortIndex: true,
      dateKnown: true,
      datePrecision: true,
      yearCreated: true,
      yearCompleted: true,
      dateEarliest: true,
      dateLatest: true,
      series: true,
      timelineDate: true,
      dateDisplay: true,
    },
  })

  const seriesMeta = new Map<number, { yearStart?: number | null; yearEnd?: number | null }>()
  for (const doc of docs) {
    const s = doc.series
    if (typeof s === 'object' && s !== null && typeof s.id === 'number') {
      seriesMeta.set(s.id, { yearStart: s.yearStart, yearEnd: s.yearEnd })
    }
  }

  const datedWorks: DatedWork[] = []
  for (const doc of docs) {
    const dw = toDatedWork(doc, seriesMeta)
    if (dw) datedWorks.push(dw)
  }

  const timelineDates = computeTimelineDates(datedWorks)
  let updated = 0
  const skipped = docs.length - datedWorks.length

  for (const doc of docs) {
    const id = String(doc.id)
    const timelineDate = timelineDates.get(id)
    if (!timelineDate) continue

    const precision = defaultDatePrecision(doc.datePrecision) as DatePrecision
    const dateDisplay = formatDateDisplay({
      datePrecision: precision,
      yearCreated: doc.yearCreated ?? 0,
      yearCompleted: doc.yearCompleted,
      dateKnown: doc.dateKnown,
      dateEarliest: doc.dateEarliest,
      dateLatest: doc.dateLatest,
      seriesYearStart:
        typeof doc.series === 'object' && doc.series ? doc.series.yearStart : null,
      seriesYearEnd:
        typeof doc.series === 'object' && doc.series ? doc.series.yearEnd : null,
    })

    await payload.update({
      collection: 'artworks',
      id: doc.id,
      data: {
        timelineDate: timelineDate.toISOString(),
        dateDisplay,
      },
      overrideAccess: false,
      user: options.user,
      context: { skipHooks: true },
    })
    updated += 1
  }

  return { updated, skipped }
}

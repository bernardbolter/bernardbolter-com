import type { Payload, Where } from 'payload'

import type { User } from '@/payload-types'

import { computeTimelineDates } from '../computeTimelineDates'
import type { DatedWork } from './types'
import { defaultDatePrecision } from './types'

export async function estimateTimelineDateForWork(
  payload: Payload,
  user: User,
  args: {
    artworkId: number
    proposedSortIndex: number
    seriesId?: number | null
  },
): Promise<string | null> {
  const where: Where =
    args.seriesId != null
      ? { series: { equals: args.seriesId } }
      : { sortIndex: { exists: true } }

  const { docs } = await payload.find({
    collection: 'artworks',
    where,
    limit: 2000,
    depth: 1,
    overrideAccess: false,
    user: user as never,
    select: {
      sortIndex: true,
      dateKnown: true,
      datePrecision: true,
      yearCreated: true,
      series: true,
    },
  })

  const datedWorks: DatedWork[] = []
  for (const doc of docs) {
    const sortIndex =
      doc.id === args.artworkId ? args.proposedSortIndex : doc.sortIndex
    if (sortIndex == null || typeof doc.yearCreated !== 'number') continue

    datedWorks.push({
      id: String(doc.id),
      sortIndex,
      dateKnown: doc.dateKnown ? new Date(doc.dateKnown) : null,
      datePrecision: defaultDatePrecision(doc.datePrecision),
      yearCreated: doc.yearCreated,
      seriesYearStart:
        typeof doc.series === 'object' && doc.series ? doc.series.yearStart : null,
      seriesYearEnd:
        typeof doc.series === 'object' && doc.series ? doc.series.yearEnd : null,
    })
  }

  const dates = computeTimelineDates(datedWorks)
  const estimate = dates.get(String(args.artworkId))
  return estimate ? estimate.toISOString().slice(0, 10) : null
}

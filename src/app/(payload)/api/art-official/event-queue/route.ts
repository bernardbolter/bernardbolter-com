import { countMissingPageFields } from '@/lib/artOfficial/eventEnrichment'
import {
  EVENT_TYPE_OPTIONS,
  EVENT_TYPE_SHORT_LABEL,
  type EventTypeValue,
} from '@/lib/artOfficial/eventTypeOptions'
import { requireStaff } from '@/lib/artOfficial/requireStaff'
import type { Event } from '@/payload-types'

export async function GET(request: Request) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const eventType = url.searchParams.get('eventType') ?? 'all'
  const statusFilter = url.searchParams.get('status') ?? 'all'
  const sort = url.searchParams.get('sort') ?? 'year-desc'

  const where: Record<string, unknown> = {
    enrichmentStatus: {
      in:
        statusFilter === 'stub' ? ['stub']
        : statusFilter === 'partial' ? ['partial']
        : ['stub', 'partial'],
    },
  }

  if (eventType && eventType !== 'all') {
    where.eventType = { equals: eventType }
  }

  const sortKey = sort === 'year-asc' ? 'yearStart' : sort === 'type' ? 'eventType' : 'yearStart'

  const result = await payload.find({
    collection: 'events',
    where: where as never,
    limit: 200,
    depth: 0,
    sort: sortKey,
    overrideAccess: false,
    user,
  })

  let docs = result.docs.map((doc) => {
    const missingCount = countMissingPageFields(doc as Event)
    const type = doc.eventType as EventTypeValue
    return {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      yearStart: doc.yearStart,
      eventType: type,
      eventTypeLabel: EVENT_TYPE_SHORT_LABEL[type] ?? type,
      venueName: doc.venueName,
      venueCity: doc.venueCity,
      enrichmentStatus: doc.enrichmentStatus ?? 'stub',
      missingCount,
    }
  })

  if (sort === 'year-desc') {
    docs = [...docs].sort((a, b) => (b.yearStart ?? 0) - (a.yearStart ?? 0))
  } else if (sort === 'missing-desc') {
    docs = [...docs].sort((a, b) => b.missingCount - a.missingCount)
  }

  const typeCounts = await payload.find({
    collection: 'events',
    where: { enrichmentStatus: { in: ['stub', 'partial'] } } as never,
    limit: 500,
    depth: 0,
    overrideAccess: false,
    user,
  })

  const typeFilterOptions: Array<{ value: string; label: string; count: number }> = []
  const byType = new Map<string, number>()
  for (const row of typeCounts.docs) {
    const t = row.eventType ?? 'other'
    byType.set(t, (byType.get(t) ?? 0) + 1)
  }
  for (const opt of EVENT_TYPE_OPTIONS) {
    const count = byType.get(opt.value) ?? 0
    if (count > 0) {
      typeFilterOptions.push({
        value: opt.value,
        label: EVENT_TYPE_SHORT_LABEL[opt.value],
        count,
      })
    }
  }

  return Response.json({ docs, typeFilterOptions, totalDocs: docs.length })
}

import { countMissingIntentFields } from '@/lib/artOfficial/unreasonedQueue'
import { requireStaff } from '@/lib/artOfficial/requireStaff'

export async function GET(request: Request) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const seriesId = url.searchParams.get('seriesId')
  const statusFilter = url.searchParams.get('status') ?? 'all'
  const sort = url.searchParams.get('sort') ?? 'year-desc'

  const where: Record<string, unknown> = {
    reasoningStatus: {
      in: statusFilter === 'stub' ? ['stub'] : statusFilter === 'partial' ? ['partial'] : ['stub', 'partial'],
    },
  }

  if (seriesId && seriesId !== 'all') {
    where.series = { equals: Number(seriesId) }
  }

  const sortKey =
    sort === 'year-asc'
      ? 'yearCreated'
      : sort === 'series'
        ? 'series'
        : 'yearCreated'

  const result = await payload.find({
    collection: 'artworks',
    where: where as never,
    limit: 200,
    depth: 1,
    sort: sortKey,
    overrideAccess: false,
    user,
  })

  let docs = result.docs.map((doc) => {
    const series =
      typeof doc.series === 'object' && doc.series !== null
        ? {
            id: doc.series.id,
            title: doc.series.title,
            slug: doc.series.slug,
          }
        : null

    const primaryImage =
      typeof doc.primaryImage === 'object' && doc.primaryImage !== null
        ? {
            id: doc.primaryImage.id,
            url: doc.primaryImage.url,
            thumbnailURL: doc.primaryImage.thumbnailURL ?? doc.primaryImage.url,
            width: doc.primaryImage.width,
            height: doc.primaryImage.height,
          }
        : null

    const missingCount = countMissingIntentFields(doc as Record<string, unknown>)

    return {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      yearCreated: doc.yearCreated,
      reasoningStatus: doc.reasoningStatus ?? 'complete',
      series,
      primaryImage,
      missingCount,
    }
  })

  if (sort === 'missing-desc') {
    docs = [...docs].sort((a, b) => b.missingCount - a.missingCount)
  }

  const seriesCounts = await payload.find({
    collection: 'artworks',
    where: {
      reasoningStatus: { in: ['stub', 'partial'] },
    } as never,
    limit: 500,
    depth: 1,
    overrideAccess: false,
    user,
  })

  const seriesFilterOptions: Array<{ id: number; title: string; count: number }> = []
  const bySeries = new Map<number, { id: number; title: string; count: number }>()
  for (const row of seriesCounts.docs) {
    const s =
      typeof row.series === 'object' && row.series !== null ? row.series : null
    if (!s?.id) continue
    const existing = bySeries.get(s.id)
    if (existing) {
      existing.count += 1
    } else {
      bySeries.set(s.id, {
        id: s.id,
        title: typeof s.title === 'string' ? s.title : String(s.id),
        count: 1,
      })
    }
  }
  seriesFilterOptions.push(...bySeries.values())
  seriesFilterOptions.sort((a, b) => a.title.localeCompare(b.title))

  return Response.json({ docs, seriesFilterOptions, totalDocs: docs.length })
}

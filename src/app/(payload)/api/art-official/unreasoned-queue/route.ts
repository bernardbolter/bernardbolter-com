import { countMissingIntentFields } from '@/lib/artOfficial/unreasonedQueue'
import { requireStaff } from '@/lib/artOfficial/requireStaff'
import {
  deriveReasoningStatus,
  indexSessionEvidence,
  primarySessionsForArtwork,
  type ReasoningStatusValue,
} from '@/lib/artwork/deriveReasoningStatus'
import { fetchCompletedSessionEvidence } from '@/lib/artwork/fetchSessionEvidence'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'

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
    status: { equals: 'published' },
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

  const [result, sessionEvidence] = await Promise.all([
    payload.find({
      collection: 'artworks',
      where: where as never,
      limit: 500,
      depth: 1,
      sort: sortKey,
      overrideAccess: false,
      user,
    }),
    fetchCompletedSessionEvidence(payload),
  ])

  const sessionIndex = indexSessionEvidence(sessionEvidence)

  const allowedStatuses: ReasoningStatusValue[] =
    statusFilter === 'stub'
      ? ['stub']
      : statusFilter === 'partial'
        ? ['partial']
        : ['stub', 'partial']

  let docs = result.docs
    .filter((doc) => isPublicCatalogueSlug(doc.slug))
    .map((doc) => {
      const slug = doc.slug?.trim() || String(doc.id)
      const primary = primarySessionsForArtwork({ id: doc.id, slug }, sessionIndex)
      const derived = deriveReasoningStatus(doc, primary)

      const series =
        typeof doc.series === 'object' && doc.series !== null
          ? {
              id: doc.series.id,
              title: doc.series.name,
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

      const missingCount = countMissingIntentFields(doc as unknown as Record<string, unknown>)

      return {
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        yearCreated: doc.yearCreated,
        reasoningStatus: derived.status,
        partialKind: derived.partialKind,
        series,
        primaryImage,
        missingCount,
      }
    })
    .filter((row) => allowedStatuses.includes(row.reasoningStatus))

  if (sort === 'missing-desc') {
    docs = [...docs].sort((a, b) => b.missingCount - a.missingCount)
  }

  const seriesFilterOptions: Array<{ id: number; title: string; count: number }> = []
  const bySeries = new Map<number, { id: number; title: string; count: number }>()
  for (const row of docs) {
    const s = row.series
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

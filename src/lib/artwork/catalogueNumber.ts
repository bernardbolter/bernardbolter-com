import type { Payload, PayloadRequest } from 'payload'

import { getSeriesInitials } from '@/helpers/seriesInitals'
import type { Series } from '@/payload-types'

const DEFAULT_CATALOGUE_PREFIX = 'BB'

export function formatCatalogueNumber(args: {
  prefix?: string | null
  seriesCode: string
  year: number
  sequence: number
}): string {
  const prefix = (args.prefix?.trim() || DEFAULT_CATALOGUE_PREFIX).toUpperCase()
  const code = args.seriesCode.trim().toUpperCase() || 'GEN'
  const year = String(args.year)
  const sequence = String(args.sequence).padStart(3, '0')
  return `${prefix}-${code}-${year}-${sequence}`
}

export async function resolveTopLevelSeriesSlug(
  payload: Payload,
  seriesId: number | string,
  req?: PayloadRequest,
): Promise<string | null> {
  const series = await payload.findByID({
    collection: 'series',
    id: seriesId,
    depth: 2,
    req,
  })
  if (!series?.slug) return null

  let current: Series = series
  while (current.parentSeries && typeof current.parentSeries === 'object') {
    current = current.parentSeries as Series
  }
  return typeof current.slug === 'string' ? current.slug : null
}

export function seriesCodeFromSlug(seriesSlug: string): string {
  const initials = getSeriesInitials(seriesSlug)
  if (initials) return initials.toUpperCase()
  const parts = seriesSlug.split('-').filter(Boolean)
  if (parts.length >= 2) {
    return parts
      .slice(0, 3)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
  }
  return seriesSlug.slice(0, 3).toUpperCase()
}

export type SeriesTreeRow = {
  id: number
  slug: string
  parentSeriesId: number | null
}

/** All series ids under the same top-level ancestor (inclusive) — shared catalogue sequence scope. */
export function seriesIdsInTopLevelTree(
  rows: SeriesTreeRow[],
  seriesId: number,
): number[] {
  const parentById = new Map(rows.map((r) => [r.id, r.parentSeriesId]))

  let rootId = seriesId
  let current: number | null = seriesId
  const visitedUp = new Set<number>()
  while (current != null && !visitedUp.has(current)) {
    visitedUp.add(current)
    const parent = parentById.get(current)
    if (parent == null) {
      rootId = current
      break
    }
    current = parent
  }

  const inTree = new Set<number>()
  for (const row of rows) {
    let cur: number | null = row.id
    const visited = new Set<number>()
    while (cur != null && !visited.has(cur)) {
      visited.add(cur)
      if (cur === rootId) {
        inTree.add(row.id)
        break
      }
      cur = parentById.get(cur) ?? null
    }
  }
  if (!inTree.size) inTree.add(seriesId)
  return [...inTree]
}

async function loadSeriesTreeRows(
  payload: Payload,
  req?: PayloadRequest,
): Promise<SeriesTreeRow[]> {
  const res = await payload.find({
    collection: 'series',
    limit: 500,
    depth: 0,
    req,
  })
  return res.docs.map((doc) => ({
    id: doc.id as number,
    slug: typeof doc.slug === 'string' ? doc.slug : '',
    parentSeriesId:
      typeof doc.parentSeries === 'number' ? doc.parentSeries : null,
  }))
}

export async function nextCatalogueSequenceForSeriesYear(
  payload: Payload,
  seriesId: number | string,
  year: number,
  req?: PayloadRequest,
): Promise<number> {
  const rows = await loadSeriesTreeRows(payload, req)
  const treeIds = seriesIdsInTopLevelTree(rows, Number(seriesId))

  const result = await payload.find({
    collection: 'artworks',
    where: {
      and: [{ series: { in: treeIds } }, { yearCreated: { equals: year } }],
    },
    limit: 1,
    sort: '-catalogueSequence',
    depth: 0,
    select: { catalogueSequence: true },
    req,
  })

  const top = result.docs[0]?.catalogueSequence
  if (typeof top === 'number' && !Number.isNaN(top)) {
    return top + 1
  }
  return result.totalDocs + 1
}

export async function buildCatalogueIdentity(args: {
  payload: Payload
  seriesId: number | string
  yearCreated: number
  cataloguePrefix?: string | null
  req?: PayloadRequest
}): Promise<{ catalogueSequence: number; catalogueNumber: string }> {
  const topSlug = await resolveTopLevelSeriesSlug(args.payload, args.seriesId, args.req)
  const seriesCode = topSlug ? seriesCodeFromSlug(topSlug) : 'GEN'
  const catalogueSequence = await nextCatalogueSequenceForSeriesYear(
    args.payload,
    args.seriesId,
    args.yearCreated,
    args.req,
  )

  let sequence = catalogueSequence
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const catalogueNumber = formatCatalogueNumber({
      prefix: args.cataloguePrefix,
      seriesCode,
      year: args.yearCreated,
      sequence,
    })

    const clash = await args.payload.find({
      collection: 'artworks',
      where: { catalogueNumber: { equals: catalogueNumber } },
      limit: 1,
      depth: 0,
      req: args.req,
    })

    if (!clash.docs.length) {
      return { catalogueSequence: sequence, catalogueNumber }
    }

    sequence += 1
  }

  throw new Error(
    `Could not allocate a unique catalogue number for series ${args.seriesId} (${args.yearCreated}).`,
  )
}

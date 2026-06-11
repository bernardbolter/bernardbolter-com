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

export async function nextCatalogueSequenceForSeriesYear(
  payload: Payload,
  seriesId: number | string,
  year: number,
  req?: PayloadRequest,
): Promise<number> {
  const result = await payload.find({
    collection: 'artworks',
    where: {
      and: [{ series: { equals: seriesId } }, { yearCreated: { equals: year } }],
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
  const catalogueNumber = formatCatalogueNumber({
    prefix: args.cataloguePrefix,
    seriesCode,
    year: args.yearCreated,
    sequence: catalogueSequence,
  })
  return { catalogueSequence, catalogueNumber }
}

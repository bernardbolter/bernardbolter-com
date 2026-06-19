import type { PayloadRequest } from 'payload'

import {
  DCS_ROOT_SERIES_SLUG,
  resolveArtworkSeriesSlug,
} from '@/lib/artOfficial/catalogScope'

export type DcsEditionTierSeed = {
  seriesEditionTier: number
}

function editionTiersLength(editionTiers: unknown[] | undefined | null): number {
  return Array.isArray(editionTiers) ? editionTiers.length : 0
}

export function shouldAutopopulateDcsEditionTiers(args: {
  seriesSlug: string | null | undefined
  editionTiers: unknown[] | undefined | null
}): boolean {
  if (args.seriesSlug !== DCS_ROOT_SERIES_SLUG) return false
  return editionTiersLength(args.editionTiers) === 0
}

/** Effective editionTiers[] after merge — respects explicit clears in incoming data. */
export function resolveEffectiveEditionTiers(
  data: Record<string, unknown>,
  prev: Record<string, unknown>,
): unknown[] | undefined {
  const dcs = data.dcs as Record<string, unknown> | undefined
  if (dcs && 'editionTiers' in dcs) {
    return Array.isArray(dcs.editionTiers) ? dcs.editionTiers : []
  }

  const prevDcs = prev.dcs as Record<string, unknown> | undefined
  if (Array.isArray(prevDcs?.editionTiers)) {
    return prevDcs.editionTiers as unknown[]
  }

  return undefined
}

export function buildAutopopulatedDcsEditionTiers(
  seriesEditionTierIds: number[],
): DcsEditionTierSeed[] {
  return seriesEditionTierIds.map((id) => ({ seriesEditionTier: id }))
}

export async function fetchDcsSeriesEditionTierIds(req: PayloadRequest): Promise<number[]> {
  const seriesResult = await req.payload.find({
    collection: 'series',
    where: { slug: { equals: DCS_ROOT_SERIES_SLUG } },
    limit: 1,
    depth: 0,
    req,
  })

  const series = seriesResult.docs[0]
  if (!series) return []

  const tiersResult = await req.payload.find({
    collection: 'series-edition-tiers',
    where: { series: { equals: series.id } },
    sort: 'tierOrder',
    limit: 10,
    depth: 0,
    req,
  })

  return tiersResult.docs.map((tier) => tier.id)
}

function readSeriesId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim())
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' && Number.isFinite(id)) return id
    if (typeof id === 'string' && /^\d+$/.test(id.trim())) return Number(id.trim())
  }
  return null
}

export async function resolveDcsSeriesSlug(
  data: Record<string, unknown>,
  prev: Record<string, unknown>,
  req: PayloadRequest,
): Promise<string | null> {
  const fromData = resolveArtworkSeriesSlug(data, undefined)
  if (fromData) return fromData

  const fromPrev = resolveArtworkSeriesSlug(prev, undefined)
  if (fromPrev) return fromPrev

  const seriesId = readSeriesId(data.series) ?? readSeriesId(prev.series)
  if (seriesId == null) return null

  try {
    const series = await req.payload.findByID({
      collection: 'series',
      id: seriesId,
      depth: 0,
      req,
    })
    return typeof series?.slug === 'string' ? series.slug : null
  } catch {
    return null
  }
}

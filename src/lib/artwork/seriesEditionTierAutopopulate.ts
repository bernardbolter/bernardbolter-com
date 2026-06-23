import type { PayloadRequest } from 'payload'

import {
  DCS_ROOT_SERIES_SLUG,
  MEGACITIES_ROOT_SERIES_SLUG,
  resolveArtworkSeriesSlug,
} from '@/lib/artOfficial/catalogScope'
import { seriesEditionTierKeys } from '@/lib/artwork/seriesEditionTiers'

export type SeriesEditionTierSeed = {
  seriesTierKey: string
}

/** Explicit allowlist — do not auto-populate for every series with edition tiers. */
export const SERIES_EDITION_TIER_AUTOPOPULATE_SLUGS = [
  DCS_ROOT_SERIES_SLUG,
  MEGACITIES_ROOT_SERIES_SLUG,
] as const

export type SeriesEditionTierAutopopulateTarget = {
  seriesSlug: (typeof SERIES_EDITION_TIER_AUTOPOPULATE_SLUGS)[number]
  resolveEffectiveTiers: (
    data: Record<string, unknown>,
    prev: Record<string, unknown>,
  ) => unknown[] | undefined
  applyAutopopulatedTiers: (
    data: Record<string, unknown>,
    tiers: SeriesEditionTierSeed[],
  ) => void
}

function editionTiersLength(editionTiers: unknown[] | undefined | null): number {
  return Array.isArray(editionTiers) ? editionTiers.length : 0
}

export function resolveDcsEffectiveEditionTiers(
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

function applyDcsAutopopulatedTiers(
  data: Record<string, unknown>,
  tiers: SeriesEditionTierSeed[],
): void {
  const prevDcs = (data.dcs as Record<string, unknown> | undefined) ?? {}
  data.dcs = {
    ...prevDcs,
    editionTiers: tiers,
  }
}

export function resolveMegacitiesEffectiveEditionTiers(
  data: Record<string, unknown>,
  prev: Record<string, unknown>,
): unknown[] | undefined {
  const megacities = data.megacities as Record<string, unknown> | undefined
  const print = megacities?.print as Record<string, unknown> | undefined
  if (print && 'editions' in print) {
    return Array.isArray(print.editions) ? print.editions : []
  }

  const prevMegacities = prev.megacities as Record<string, unknown> | undefined
  const prevPrint = prevMegacities?.print as Record<string, unknown> | undefined
  if (Array.isArray(prevPrint?.editions)) {
    return prevPrint.editions as unknown[]
  }

  return undefined
}

function applyMegacitiesAutopopulatedTiers(
  data: Record<string, unknown>,
  tiers: SeriesEditionTierSeed[],
): void {
  const prevMegacities = (data.megacities as Record<string, unknown> | undefined) ?? {}
  const prevPrint = (prevMegacities.print as Record<string, unknown> | undefined) ?? {}
  data.megacities = {
    ...prevMegacities,
    print: {
      ...prevPrint,
      printAvailable: prevPrint.printAvailable ?? true,
      editions: tiers,
    },
  }
}

export const SERIES_EDITION_TIER_AUTOPOPULATE_TARGETS: Record<
  string,
  SeriesEditionTierAutopopulateTarget
> = {
  [DCS_ROOT_SERIES_SLUG]: {
    seriesSlug: DCS_ROOT_SERIES_SLUG,
    resolveEffectiveTiers: resolveDcsEffectiveEditionTiers,
    applyAutopopulatedTiers: applyDcsAutopopulatedTiers,
  },
  [MEGACITIES_ROOT_SERIES_SLUG]: {
    seriesSlug: MEGACITIES_ROOT_SERIES_SLUG,
    resolveEffectiveTiers: resolveMegacitiesEffectiveEditionTiers,
    applyAutopopulatedTiers: applyMegacitiesAutopopulatedTiers,
  },
}

export function getSeriesEditionTierAutopopulateTarget(
  seriesSlug: string | null | undefined,
): SeriesEditionTierAutopopulateTarget | null {
  if (!seriesSlug) return null
  return SERIES_EDITION_TIER_AUTOPOPULATE_TARGETS[seriesSlug] ?? null
}

export function shouldAutopopulateSeriesEditionTiers(args: {
  seriesSlug: string | null | undefined
  editionTiers: unknown[] | undefined | null
}): boolean {
  if (!getSeriesEditionTierAutopopulateTarget(args.seriesSlug)) return false
  return editionTiersLength(args.editionTiers) === 0
}

export function buildAutopopulatedSeriesEditionTiers(
  seriesTierKeys: string[],
): SeriesEditionTierSeed[] {
  return seriesTierKeys.map((seriesTierKey) => ({ seriesTierKey }))
}

export async function fetchSeriesEditionTierKeysForSlug(
  req: PayloadRequest,
  seriesSlug: string,
): Promise<string[]> {
  const seriesResult = await req.payload.find({
    collection: 'series',
    where: { slug: { equals: seriesSlug } },
    limit: 1,
    depth: 0,
    req,
  })

  const series = seriesResult.docs[0]
  if (!series) return []

  return seriesEditionTierKeys(series)
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

export async function resolveArtworkSeriesSlugForAutopopulate(
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

/** @deprecated Use fetchSeriesEditionTierKeysForSlug */
export const fetchSeriesEditionTierIdsForSlug = fetchSeriesEditionTierKeysForSlug

/** @deprecated Use buildAutopopulatedSeriesEditionTiers with tier keys */
export function buildAutopopulatedSeriesEditionTierIds(seriesEditionTierIds: number[]) {
  return seriesEditionTierIds.map((id) => ({ seriesEditionTier: id }))
}

/** @deprecated Use resolveDcsEffectiveEditionTiers via SERIES_EDITION_TIER_AUTOPOPULATE_TARGETS */
export const resolveEffectiveEditionTiers = resolveDcsEffectiveEditionTiers

/** @deprecated Use shouldAutopopulateSeriesEditionTiers */
export const shouldAutopopulateDcsEditionTiers = shouldAutopopulateSeriesEditionTiers

/** @deprecated Use buildAutopopulatedSeriesEditionTiers */
export const buildAutopopulatedDcsEditionTiers = buildAutopopulatedSeriesEditionTiers

/** @deprecated Use fetchSeriesEditionTierKeysForSlug with DCS_ROOT_SERIES_SLUG */
export const fetchDcsSeriesEditionTierIds = (req: PayloadRequest) =>
  fetchSeriesEditionTierKeysForSlug(req, DCS_ROOT_SERIES_SLUG)

/** @deprecated Use resolveArtworkSeriesSlugForAutopopulate */
export const resolveDcsSeriesSlug = resolveArtworkSeriesSlugForAutopopulate

export type DcsEditionTierSeed = SeriesEditionTierSeed

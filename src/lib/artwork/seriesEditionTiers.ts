import type { Artwork, Series } from '@/payload-types'

export type SeriesEditionTierSpec = {
  tierKey: string
  tierName: string
  tierOrder: number
  isOriginalTier?: boolean | null
  editionSize: number
  apCount?: number | null
  dimensionUnit?: ('cm' | 'in') | null
  widthWhole?: number | null
  widthFraction?: string | null
  heightWhole?: number | null
  heightFraction?: string | null
  widthCm?: number | null
  heightCm?: number | null
  substrate?: string | null
  printTechnique?: string | null
  vendureProductId?: string | null
  notes?: string | null
}

export function slugifySeriesTierKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function seriesEditionTiersFromSeries(series: Series | null | undefined): SeriesEditionTierSpec[] {
  const rows = series?.editionTiers
  if (!Array.isArray(rows)) return []

  return rows
    .filter((row): row is SeriesEditionTierSpec => Boolean(row?.tierKey?.trim() && row?.tierName?.trim()))
    .slice()
    .sort((a, b) => (a.tierOrder ?? 0) - (b.tierOrder ?? 0))
}

export function resolveArtworkSeriesDoc(artwork: Artwork): Series | null {
  const series = artwork.series
  if (!series || typeof series !== 'object') return null
  return series
}

export function findSeriesEditionTier(
  artwork: Artwork,
  tierKey: string | null | undefined,
): SeriesEditionTierSpec | null {
  const key = tierKey?.trim()
  if (!key) return null

  const tiers = seriesEditionTiersFromSeries(resolveArtworkSeriesDoc(artwork))
  return tiers.find((tier) => tier.tierKey === key) ?? null
}

export function seriesEditionTierKeys(series: Series | null | undefined): string[] {
  return seriesEditionTiersFromSeries(series).map((tier) => tier.tierKey)
}

import type { Artwork } from '@/payload-types'

import {
  buildEditionTierSpecLine,
  type EditionTierLabelMaps,
  type EditionTierSpecInput,
  substrateLabel,
} from '@/lib/artwork/editionTierDisplay'
import {
  findSeriesEditionTier,
  seriesEditionTiersFromSeries,
  resolveArtworkSeriesDoc,
  type SeriesEditionTierSpec,
} from '@/lib/artwork/seriesEditionTiers'

export type OwnershipRegistryCopy = {
  copyNumber?: string | null
  isArtistProof?: boolean | null
  owner?: string | null
  claimStatus?:
    | 'unclaimed'
    | 'claimed-pending'
    | 'claimed-confirmed'
    | 'artist-held'
    | 'sold-secondary'
    | null
  collectorVisible?: boolean | null
  dateAcquired?: string | null
  claimedCopyNumberKnown?: boolean | null
}

export type OwnershipRegistryTier = {
  tierLabel?: string | null
  tierOrder?: number | null
  editionSize?: number | null
  apCount?: number | null
  isOriginalTier?: boolean | null
  copies?: OwnershipRegistryCopy[] | null
  printSubstrate?: string | null
  printTechnique?: string | null
  dimensions?: string | null
  dimensionUnit?: string | null
  widthWhole?: number | null
  widthFraction?: string | null
  heightWhole?: number | null
  heightFraction?: string | null
  widthCm?: number | null
  heightCm?: number | null
}

export type PublicEditionTierRow = {
  copyNumber: string
  ownerLabel: string
  isArtistProof: boolean
}

export type PublicEditionTier = {
  tierLabel: string
  tierOrder: number
  editionSize: number
  headerSummary: string
  specLine: string | null
  claimedRows: PublicEditionTierRow[]
  apRow: PublicEditionTierRow | null
  claimHref: string
}

function tierSpecInput(tier: OwnershipRegistryTier): EditionTierSpecInput {
  return {
    editionSize: tier.editionSize,
    apCount: tier.apCount,
    dimensionUnit: tier.dimensionUnit,
    widthWhole: tier.widthWhole,
    widthFraction: tier.widthFraction,
    heightWhole: tier.heightWhole,
    heightFraction: tier.heightFraction,
    widthCm: tier.widthCm,
    heightCm: tier.heightCm,
    dimensions: tier.dimensions,
    substrate: tier.printSubstrate,
    printTechnique: tier.printTechnique,
  }
}

export function buildOwnershipTierSpecLine(
  tier: OwnershipRegistryTier,
  labelMaps?: EditionTierLabelMaps,
): string | null {
  return buildEditionTierSpecLine(tierSpecInput(tier), labelMaps)
}

function resolveSeriesEditionTierSpec(
  artwork: Artwork,
  tierKey: string | null | undefined,
): SeriesEditionTierSpec | null {
  return findSeriesEditionTier(artwork, tierKey)
}

const DCS_TIER_LABELS: Record<string, string> = {
  'small-print': 'Small print',
  'collectors-print': "Collector's print",
  monumental: 'Original edition',
  'oil-painting': 'Oil painting',
}

const DCS_TIER_ORDER: Record<string, number> = {
  monumental: 1,
  'oil-painting': 1,
  'collectors-print': 2,
  'small-print': 3,
}

const MEGACITIES_TIER_LABELS: Record<string, string> = {
  full_size: 'Full size',
  a0: 'A0',
  a1: 'A1',
}

function countArtistProofs(copies: OwnershipRegistryCopy[] | null | undefined): number {
  return (copies ?? []).filter((copy) => copy?.isArtistProof).length
}

function normalizeCopies(
  copies: OwnershipRegistryCopy[] | null | undefined,
): OwnershipRegistryCopy[] {
  return Array.isArray(copies) ? copies : []
}

type DcsEditionTier = NonNullable<NonNullable<Artwork['dcs']>['editionTiers']>[number]
type MegacitiesEditionTier = NonNullable<
  NonNullable<NonNullable<Artwork['megacities']>['print']>['editions']
>[number]

function seriesTierSpecToRegistryTier(spec: SeriesEditionTierSpec): OwnershipRegistryTier {
  return {
    tierLabel: spec.tierName?.trim() || spec.tierKey,
    tierOrder: spec.tierOrder ?? 0,
    editionSize: spec.editionSize,
    apCount: spec.apCount ?? 0,
    isOriginalTier: spec.isOriginalTier ?? false,
    copies: [],
    printSubstrate: spec.substrate?.trim() || null,
    printTechnique: spec.printTechnique,
    dimensionUnit: spec.dimensionUnit,
    widthWhole: spec.widthWhole,
    widthFraction: spec.widthFraction,
    heightWhole: spec.heightWhole,
    heightFraction: spec.heightFraction,
    widthCm: spec.widthCm,
    heightCm: spec.heightCm,
  }
}

function mergeSeriesEditionTiersWithArtworkRows<T extends { seriesTierKey?: string | null }>(
  artwork: Artwork,
  seriesSpecs: SeriesEditionTierSpec[],
  artworkRows: T[],
  convertRow: (artwork: Artwork, row: T, index: number) => OwnershipRegistryTier,
): OwnershipRegistryTier[] {
  const rowByKey = new Map<string, T>()
  for (const row of artworkRows) {
    const key = row.seriesTierKey?.trim()
    if (key) rowByKey.set(key, row)
  }

  const merged = seriesSpecs.map((spec, index) => {
    const row = rowByKey.get(spec.tierKey)
    if (row) return convertRow(artwork, row, index)
    return seriesTierSpecToRegistryTier(spec)
  })

  const coveredKeys = new Set(seriesSpecs.map((spec) => spec.tierKey))
  for (const row of artworkRows) {
    const key = row.seriesTierKey?.trim()
    if (key && coveredKeys.has(key)) continue
    merged.push(convertRow(artwork, row, merged.length))
  }

  return merged.slice().sort((a, b) => (a.tierOrder ?? 0) - (b.tierOrder ?? 0))
}

function seriesEditionTiersForArtwork(artwork: Artwork): OwnershipRegistryTier[] {
  const specs = seriesEditionTiersFromSeries(resolveArtworkSeriesDoc(artwork))
  if (specs.length === 0) return []
  return specs.map(seriesTierSpecToRegistryTier)
}

function dcsTierToRegistryTier(
  artwork: Artwork,
  tier: DcsEditionTier,
  index: number,
): OwnershipRegistryTier {
  const copies = normalizeCopies(tier.copies as OwnershipRegistryCopy[] | undefined)
  const seriesTier = resolveSeriesEditionTierSpec(artwork, tier.seriesTierKey)

  if (seriesTier) {
    return {
      tierLabel: seriesTier.tierName?.trim() || `Edition ${index + 1}`,
      tierOrder: seriesTier.tierOrder ?? index + 1,
      editionSize: seriesTier.editionSize,
      apCount: seriesTier.apCount ?? countArtistProofs(copies),
      isOriginalTier: seriesTier.isOriginalTier ?? tier.isOriginalTier ?? false,
      copies,
      printSubstrate: seriesTier.substrate?.trim() || substrateLabel(tier.printSubstrate),
      printTechnique: seriesTier.printTechnique,
      dimensionUnit: seriesTier.dimensionUnit,
      widthWhole: seriesTier.widthWhole,
      widthFraction: seriesTier.widthFraction,
      heightWhole: seriesTier.heightWhole,
      heightFraction: seriesTier.heightFraction,
      widthCm: seriesTier.widthCm,
      heightCm: seriesTier.heightCm,
    }
  }

  const tierName = tier.tierName ?? ''

  return {
    tierLabel: DCS_TIER_LABELS[tierName] ?? tierName,
    tierOrder: DCS_TIER_ORDER[tierName] ?? index + 1,
    editionSize: tier.totalEditionSize,
    apCount: countArtistProofs(copies),
    isOriginalTier: tier.isOriginalTier ?? false,
    copies,
    printSubstrate: substrateLabel(tier.printSubstrate),
  }
}

function megacitiesTierToRegistryTier(
  artwork: Artwork,
  tier: MegacitiesEditionTier,
  index: number,
): OwnershipRegistryTier {
  const copies = normalizeCopies(tier.copies as OwnershipRegistryCopy[] | undefined)
  const seriesTier = resolveSeriesEditionTierSpec(artwork, tier.seriesTierKey)

  if (seriesTier) {
    return {
      tierLabel: seriesTier.tierName?.trim() || `Edition ${index + 1}`,
      tierOrder: seriesTier.tierOrder ?? index + 1,
      editionSize: seriesTier.editionSize,
      apCount: seriesTier.apCount ?? countArtistProofs(copies),
      isOriginalTier: seriesTier.isOriginalTier ?? tier.isOriginalTier ?? false,
      copies,
      printSubstrate: seriesTier.substrate?.trim() || null,
      printTechnique: seriesTier.printTechnique,
      dimensionUnit: seriesTier.dimensionUnit,
      widthWhole: seriesTier.widthWhole,
      widthFraction: seriesTier.widthFraction,
      heightWhole: seriesTier.heightWhole,
      heightFraction: seriesTier.heightFraction,
      widthCm: seriesTier.widthCm,
      heightCm: seriesTier.heightCm,
      dimensions: tier.dimensions ?? null,
    }
  }

  return {
    tierLabel:
      (tier.tier ? MEGACITIES_TIER_LABELS[tier.tier] : null) ??
      tier.tier ??
      `Edition ${index + 1}`,
    tierOrder: index + 1,
    editionSize: tier.editionSize ?? 0,
    apCount: countArtistProofs(copies),
    isOriginalTier: tier.isOriginalTier ?? false,
    copies,
    dimensions: tier.dimensions ?? null,
  }
}

function ownershipRegistryRowToTier(
  row: Record<string, unknown>,
): OwnershipRegistryTier {
  return {
    tierLabel: typeof row.tierLabel === 'string' ? row.tierLabel : null,
    tierOrder: typeof row.tierOrder === 'number' ? row.tierOrder : null,
    editionSize: typeof row.editionSize === 'number' ? row.editionSize : null,
    apCount: typeof row.apCount === 'number' ? row.apCount : null,
    isOriginalTier: row.isOriginalTier === true,
    copies: normalizeCopies(row.copies as OwnershipRegistryCopy[] | undefined),
    printSubstrate: typeof row.substrate === 'string' ? row.substrate : null,
    printTechnique: typeof row.printTechnique === 'string' ? row.printTechnique : null,
    dimensionUnit: typeof row.dimensionUnit === 'string' ? row.dimensionUnit : null,
    widthWhole: typeof row.widthWhole === 'number' ? row.widthWhole : null,
    widthFraction: typeof row.widthFraction === 'string' ? row.widthFraction : null,
    heightWhole: typeof row.heightWhole === 'number' ? row.heightWhole : null,
    heightFraction: typeof row.heightFraction === 'string' ? row.heightFraction : null,
  }
}

/** Resolve edition tiers from DCS tab, Megacities print, embedded series, or ownershipRegistry fallback. */
export function asEditionTiers(artwork: Artwork): OwnershipRegistryTier[] {
  const seriesSpecs = seriesEditionTiersFromSeries(resolveArtworkSeriesDoc(artwork))

  const dcsTiers = artwork.dcs?.editionTiers
  if (Array.isArray(dcsTiers) && dcsTiers.length > 0) {
    if (seriesSpecs.length > 0) {
      return mergeSeriesEditionTiersWithArtworkRows(
        artwork,
        seriesSpecs,
        dcsTiers,
        dcsTierToRegistryTier,
      )
    }
    return dcsTiers.map((tier, index) => dcsTierToRegistryTier(artwork, tier, index))
  }

  const megacitiesTiers = artwork.megacities?.print?.editions
  if (Array.isArray(megacitiesTiers) && megacitiesTiers.length > 0) {
    if (seriesSpecs.length > 0) {
      return mergeSeriesEditionTiersWithArtworkRows(
        artwork,
        seriesSpecs,
        megacitiesTiers,
        megacitiesTierToRegistryTier,
      )
    }
    return megacitiesTiers.map((tier, index) =>
      megacitiesTierToRegistryTier(artwork, tier, index),
    )
  }

  if (seriesSpecs.length > 0) {
    return seriesEditionTiersForArtwork(artwork)
  }

  const raw = artwork.ownershipRegistry
  return Array.isArray(raw)
    ? raw.map((tier) => ownershipRegistryRowToTier(tier as Record<string, unknown>))
    : []
}

function numberedCopies(tier: OwnershipRegistryTier): OwnershipRegistryCopy[] {
  return (tier.copies ?? []).filter((copy) => !copy?.isArtistProof)
}

function apCopies(tier: OwnershipRegistryTier): OwnershipRegistryCopy[] {
  return (tier.copies ?? []).filter((copy) => copy?.isArtistProof)
}

function countClaimedConfirmed(copies: OwnershipRegistryCopy[]): number {
  return copies.filter((copy) => copy.claimStatus === 'claimed-confirmed').length
}

export function allNumberedClaimed(tier: OwnershipRegistryTier): boolean {
  const editionSize = tier.editionSize ?? 0
  if (editionSize <= 0) return false
  return countClaimedConfirmed(numberedCopies(tier)) >= editionSize
}

function buildHeaderSummary(tier: OwnershipRegistryTier): string {
  const editionSize = tier.editionSize ?? 0
  const claimed = countClaimedConfirmed(numberedCopies(tier))

  if (editionSize <= 0) return tier.tierLabel?.trim() || 'Edition'
  if (claimed === 0) return `Edition of ${editionSize} — available`
  if (claimed >= editionSize) return `${editionSize} of ${editionSize} claimed — edition complete`
  return `${claimed} of ${editionSize} claimed`
}

function buildClaimedRow(copy: OwnershipRegistryCopy): PublicEditionTierRow | null {
  if (copy.claimStatus !== 'claimed-confirmed' || copy.isArtistProof) return null
  if (copy.collectorVisible !== true) return null
  const copyNumber = copy.copyNumber?.trim() || '—'
  const owner = copy.owner?.trim() || 'Private collection'
  return { copyNumber, ownerLabel: owner, isArtistProof: false }
}

function buildApRow(tier: OwnershipRegistryTier): PublicEditionTierRow | null {
  if (!allNumberedClaimed(tier)) return null

  const ap = apCopies(tier)[0]
  if (!ap) return null

  if (ap.claimStatus === 'sold-secondary') {
    if (ap.collectorVisible === true && ap.owner?.trim()) {
      return {
        copyNumber: 'AP',
        ownerLabel: ap.owner.trim(),
        isArtistProof: true,
      }
    }
    return { copyNumber: 'AP', ownerLabel: 'Sold by the artist', isArtistProof: true }
  }

  return { copyNumber: 'AP', ownerLabel: 'Held by the artist', isArtistProof: true }
}

export function buildEditionClaimSummary(artwork: Artwork): string[] {
  return buildPublicEditionTiers(artwork).map((tier) => {
    const claimed = tier.claimedRows.length
    const editionSize = tier.editionSize
    if (claimed === 0) return `${tier.tierLabel}: 0 of ${editionSize} claimed`
    if (claimed >= editionSize) return `${tier.tierLabel}: ${editionSize} of ${editionSize} claimed`
    return `${tier.tierLabel}: ${claimed} of ${editionSize} claimed`
  })
}

export function getOriginalTier(artwork: Artwork): OwnershipRegistryTier | null {
  return asEditionTiers(artwork).find((tier) => tier.isOriginalTier === true) ?? null
}

/** Fills missing numbered slots as unclaimed — unlike Editions accordion, unclaimed copies are shown here. */
export function buildOriginalTierDisplayCopies(tier: OwnershipRegistryTier): OwnershipRegistryCopy[] {
  const editionSize = tier.editionSize ?? 0
  const byNumber = new Map<string, OwnershipRegistryCopy>()

  for (const copy of tier.copies ?? []) {
    if (copy?.copyNumber?.trim()) {
      byNumber.set(copy.copyNumber.trim(), copy)
    }
  }

  const rows: OwnershipRegistryCopy[] = []
  for (let index = 1; index <= editionSize; index += 1) {
    const copyNumber = `${index}/${editionSize}`
    rows.push(
      byNumber.get(copyNumber) ?? {
        copyNumber,
        isArtistProof: false,
        claimStatus: 'unclaimed',
        collectorVisible: false,
      },
    )
  }

  if (allNumberedClaimed(tier)) {
    rows.push(...apCopies(tier))
  }

  return rows.filter((copy) => !copy.isArtistProof || allNumberedClaimed(tier))
}

export function buildOriginalCopyClaimHref(
  artwork: Pick<Artwork, 'slug'>,
  copyNumber: string,
): string {
  const slug = artwork.slug?.trim() || ''
  const params = new URLSearchParams({ claim: slug, copy: copyNumber })
  return `/contact?${params.toString()}`
}

export function isOriginalCopyPubliclyClaimed(copy: OwnershipRegistryCopy): boolean {
  return (
    copy.claimStatus === 'claimed-confirmed' ||
    copy.claimStatus === 'artist-held' ||
    copy.claimStatus === 'sold-secondary'
  )
}

export function originalCopyOwnerLabel(copy: OwnershipRegistryCopy): string {
  if (copy.isArtistProof) {
    return copy.claimStatus === 'sold-secondary' ? 'Sold by the artist' : 'Held by the artist'
  }
  return copy.owner?.trim() || 'Private collection'
}

export function buildPublicEditionTiers(
  artwork: Artwork,
  labelMaps?: EditionTierLabelMaps,
): PublicEditionTier[] {
  const slug = artwork.slug?.trim() || ''

  return asEditionTiers(artwork)
    .filter((tier) => tier.tierLabel?.trim() && tier.isOriginalTier !== true)
    .slice()
    .sort((a, b) => (a.tierOrder ?? 0) - (b.tierOrder ?? 0))
    .map((tier) => {
      const tierLabel = tier.tierLabel!.trim()
      const claimedRows = numberedCopies(tier)
        .map(buildClaimedRow)
        .filter((row): row is PublicEditionTierRow => row !== null)

      const params = new URLSearchParams({ claim: slug, tier: tierLabel })
      if (artwork.title?.trim()) params.set('title', artwork.title.trim())

      return {
        tierLabel,
        tierOrder: tier.tierOrder ?? 0,
        editionSize: tier.editionSize ?? 0,
        headerSummary: buildHeaderSummary(tier),
        specLine: buildEditionTierSpecLine(tierSpecInput(tier), labelMaps),
        claimedRows,
        apRow: buildApRow(tier),
        claimHref: `/contact?${params.toString()}`,
      }
    })
}

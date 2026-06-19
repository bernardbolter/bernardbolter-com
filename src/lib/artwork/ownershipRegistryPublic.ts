import type { Artwork } from '@/payload-types'

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
  dimensions?: string | null
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
  claimedRows: PublicEditionTierRow[]
  apRow: PublicEditionTierRow | null
  claimHref: string
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

function dcsTierToRegistryTier(tier: DcsEditionTier, index: number): OwnershipRegistryTier {
  const copies = normalizeCopies(tier.copies as OwnershipRegistryCopy[] | undefined)
  const tierName = tier.tierName ?? ''

  return {
    tierLabel: DCS_TIER_LABELS[tierName] ?? tierName,
    tierOrder: DCS_TIER_ORDER[tierName] ?? index + 1,
    editionSize: tier.totalEditionSize,
    apCount: countArtistProofs(copies),
    isOriginalTier: tier.isOriginalTier ?? false,
    copies,
    printSubstrate: tier.printSubstrate ?? null,
  }
}

function megacitiesTierToRegistryTier(
  tier: MegacitiesEditionTier,
  index: number,
): OwnershipRegistryTier {
  const copies = normalizeCopies(tier.copies as OwnershipRegistryCopy[] | undefined)

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

function ownershipRegistryTierToRegistryTier(tier: OwnershipRegistryTier): OwnershipRegistryTier {
  return {
    ...tier,
    copies: normalizeCopies(tier.copies),
  }
}

/** Resolve edition tiers from DCS tab, Megacities print, or ownershipRegistry fallback. */
export function asEditionTiers(artwork: Artwork): OwnershipRegistryTier[] {
  const dcsTiers = artwork.dcs?.editionTiers
  if (Array.isArray(dcsTiers) && dcsTiers.length > 0) {
    return dcsTiers.map(dcsTierToRegistryTier)
  }

  const megacitiesTiers = artwork.megacities?.print?.editions
  if (Array.isArray(megacitiesTiers) && megacitiesTiers.length > 0) {
    return megacitiesTiers.map(megacitiesTierToRegistryTier)
  }

  const raw = (artwork as Artwork & { ownershipRegistry?: OwnershipRegistryTier[] })
    .ownershipRegistry
  return Array.isArray(raw) ? raw.map(ownershipRegistryTierToRegistryTier) : []
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

export function buildPublicEditionTiers(artwork: Artwork): PublicEditionTier[] {
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
        claimedRows,
        apRow: buildApRow(tier),
        claimHref: `/contact?${params.toString()}`,
      }
    })
}

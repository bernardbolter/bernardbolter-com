import type { Artwork, SeriesEditionTier } from '@/payload-types'

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
  seriesEditionTier?: number | SeriesEditionTier | null
  tierLabel?: string | null
  tierOrder?: number | null
  editionSize?: number | null
  apCount?: number | null
  isOriginalTier?: boolean | null
  copies?: OwnershipRegistryCopy[] | null
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

function isPopulatedSeriesEditionTier(
  value: number | SeriesEditionTier | null | undefined,
): value is SeriesEditionTier {
  return typeof value === 'object' && value !== null && 'tierName' in value
}

/** Merge seriesEditionTier metadata with inline fallback fields on each registry row. */
export function resolveOwnershipRegistryTier(
  tier: OwnershipRegistryTier,
): OwnershipRegistryTier {
  const seriesTier = isPopulatedSeriesEditionTier(tier.seriesEditionTier)
    ? tier.seriesEditionTier
    : null

  if (!seriesTier) return tier

  return {
    ...tier,
    tierLabel: seriesTier.tierName,
    tierOrder: seriesTier.tierOrder,
    editionSize: seriesTier.editionSize,
    apCount: seriesTier.apCount ?? 0,
    isOriginalTier: seriesTier.isOriginalTier ?? false,
  }
}

function asTiers(artwork: Artwork): OwnershipRegistryTier[] {
  const raw = (artwork as Artwork & { ownershipRegistry?: OwnershipRegistryTier[] })
    .ownershipRegistry
  return Array.isArray(raw) ? raw.map(resolveOwnershipRegistryTier) : []
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
  return asTiers(artwork).find((tier) => tier.isOriginalTier === true) ?? null
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

  return asTiers(artwork)
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

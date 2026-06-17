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
  copies?: OwnershipRegistryCopy[] | null
}

export type PublicEditionTierRow = {
  copyNumber: string
  displayLine: string
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

function asTiers(artwork: Artwork): OwnershipRegistryTier[] {
  const raw = (artwork as Artwork & { ownershipRegistry?: OwnershipRegistryTier[] })
    .ownershipRegistry
  return Array.isArray(raw) ? raw : []
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

function allNumberedClaimed(tier: OwnershipRegistryTier): boolean {
  const numbered = numberedCopies(tier)
  if (numbered.length === 0) return false
  return numbered.every((copy) => copy.claimStatus === 'claimed-confirmed')
}

function buildHeaderSummary(tier: OwnershipRegistryTier): string {
  const editionSize = tier.editionSize ?? 0
  const claimed = countClaimedConfirmed(numberedCopies(tier))

  if (editionSize <= 0) return tier.tierLabel?.trim() || 'Edition'
  if (claimed === 0) return `Edition of ${editionSize} — available`
  if (claimed >= editionSize) return `${editionSize} of ${editionSize} claimed — edition complete`
  return `${claimed} of ${editionSize} prints claimed`
}

function buildClaimedRow(copy: OwnershipRegistryCopy): PublicEditionTierRow | null {
  if (copy.claimStatus !== 'claimed-confirmed' || !copy.collectorVisible) return null
  const copyNumber = copy.copyNumber?.trim() || '—'
  const owner = copy.owner?.trim() || 'Private collection'
  const date = copy.dateAcquired?.trim()
  const displayLine = date ? `${copyNumber} · ${owner} · ${date}` : `${copyNumber} · ${owner}`
  return { copyNumber, displayLine, isArtistProof: false }
}

function buildApRow(tier: OwnershipRegistryTier): PublicEditionTierRow | null {
  if (!allNumberedClaimed(tier)) return null

  const ap = apCopies(tier)[0]
  if (!ap) return null

  if (ap.claimStatus === 'sold-secondary') {
    if (ap.collectorVisible && ap.owner?.trim()) {
      return {
        copyNumber: 'AP',
        displayLine: `AP — ${ap.owner.trim()}`,
        isArtistProof: true,
      }
    }
    return { copyNumber: 'AP', displayLine: 'AP — sold by the artist', isArtistProof: true }
  }

  return { copyNumber: 'AP', displayLine: 'AP — held by the artist', isArtistProof: true }
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

export function buildPublicEditionTiers(artwork: Artwork): PublicEditionTier[] {
  const slug = artwork.slug?.trim() || ''

  return asTiers(artwork)
    .filter((tier) => tier.tierLabel?.trim())
    .slice()
    .sort((a, b) => (a.tierOrder ?? 0) - (b.tierOrder ?? 0))
    .map((tier) => {
      const tierLabel = tier.tierLabel!.trim()
      const claimedRows = numberedCopies(tier)
        .map(buildClaimedRow)
        .filter((row): row is PublicEditionTierRow => row !== null)

      const params = new URLSearchParams({ claim: slug, tier: tierLabel })

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

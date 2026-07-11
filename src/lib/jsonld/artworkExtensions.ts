import type { Artwork } from '@/payload-types'

import { printTechniqueLabel, substrateLabel } from '@/lib/artwork/editionTierDisplay'
import { getJsonLdProvenanceClaims, deriveJsonLdProvenanceConfidenceLevel } from '@/lib/artwork/artworkProvenancePublic'
import {
  asEditionTiers,
  getOriginalTier,
  type OwnershipRegistryTier,
} from '@/lib/artwork/ownershipRegistryPublic'
import { buildJsonLdRelatedWorks } from '@/lib/artwork/relatedWorksPublic'
import { resolveEmbeddingMetadataList } from '@/lib/artwork/visionPage'
import { buildCorpusEmbeddingMetadata, buildCorpusVisionAnalyses } from '@/lib/jsonld/visionPage'
import { toCm } from '@/lib/dimensions/physicalDimensions'

export type JsonLdEditionTierSpec = {
  tierName: string
  isOriginalTier: boolean
  editionSize: number
  apCount: number
  widthCm?: number
  heightCm?: number
  substrate?: string
  printTechnique?: string
}

const PRIVATE_EDITION_KEYS = new Set([
  'vendureProductId',
  'vendureVariantId',
  'editionsRemaining',
  'editionsRemainingUpdatedAt',
  'tierAvailabilityStatus',
  'price',
  'pricePerPrint',
  'remaining',
  'currency',
])

export function editionJsonLdHasPrivateFields(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false

  if (Array.isArray(value)) {
    return value.some(editionJsonLdHasPrivateFields)
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (PRIVATE_EDITION_KEYS.has(key)) return true
    if (editionJsonLdHasPrivateFields(nested)) return true
  }

  return false
}

function resolveTierDimensionsCm(
  tier: OwnershipRegistryTier,
): { widthCm?: number; heightCm?: number } {
  if (tier.widthCm != null && tier.heightCm != null) {
    return { widthCm: Number(tier.widthCm), heightCm: Number(tier.heightCm) }
  }

  const widthCm = toCm(tier.dimensionUnit, tier.widthWhole, tier.widthFraction)
  const heightCm = toCm(tier.dimensionUnit, tier.heightWhole, tier.heightFraction)

  return {
    ...(widthCm != null ? { widthCm } : {}),
    ...(heightCm != null ? { heightCm } : {}),
  }
}

function numberedCopies(tier: OwnershipRegistryTier) {
  return (tier.copies ?? []).filter((copy) => !copy?.isArtistProof)
}

function countClaimedConfirmed(tier: OwnershipRegistryTier): number {
  return numberedCopies(tier).filter((copy) => copy.claimStatus === 'claimed-confirmed').length
}

export function buildJsonLdEditionTierSpecs(artwork: Artwork): JsonLdEditionTierSpec[] | undefined {
  if (!artwork.hasEditions || artwork.hasEditions === 'none' || artwork.hasEditions === 'open') {
    return undefined
  }

  const tiers = asEditionTiers(artwork)
  if (tiers.length === 0) return undefined

  return tiers
    .filter((tier) => tier.tierLabel?.trim())
    .map((tier) => {
      const dimensions = resolveTierDimensionsCm(tier)
      const spec: JsonLdEditionTierSpec = {
        tierName: tier.tierLabel!.trim(),
        isOriginalTier: tier.isOriginalTier === true,
        editionSize: tier.editionSize ?? 0,
        apCount: tier.apCount ?? 0,
        ...dimensions,
      }

      const substrate = substrateLabel(tier.printSubstrate)
      if (substrate) spec.substrate = substrate

      const printTechnique = printTechniqueLabel(tier.printTechnique)
      if (printTechnique) spec.printTechnique = printTechnique

      return spec
    })
}

export function buildJsonLdEditionClaimSummary(artwork: Artwork): string[] | undefined {
  if (artwork.hasEditions !== 'limited') return undefined

  const tiers = asEditionTiers(artwork).filter((tier) => tier.tierLabel?.trim())
  if (!tiers.some((tier) => Array.isArray(tier.copies))) return undefined

  return tiers.map((tier) => {
    const editionSize = tier.editionSize ?? 0
    const claimed = countClaimedConfirmed(tier)
    return `${tier.tierLabel!.trim()}: ${claimed} of ${editionSize} claimed`
  })
}

export function buildJsonLdOriginalEditionFields(
  artwork: Artwork,
): { originalEditionSize: number; originalEditionApCount: number } | undefined {
  const originalTier = getOriginalTier(artwork)
  if (!originalTier || originalTier.editionSize == null) return undefined

  return {
    originalEditionSize: originalTier.editionSize,
    originalEditionApCount: originalTier.apCount ?? 0,
  }
}

export function applyArtworkJsonLdExtensions(
  doc: Record<string, unknown>,
  artwork: Artwork,
  baseUrl: string,
): void {
  if (artwork.hasEditions && artwork.hasEditions !== 'none') {
    if (artwork.hasEditions === 'open') {
      const note = artwork.untrackedEditionsNote?.trim()
      if (note) doc['artism:untrackedEditionsNote'] = note
    } else {
      const editionTierSpec = buildJsonLdEditionTierSpecs(artwork)
      if (editionTierSpec?.length) {
        doc['artism:editionTierSpec'] = editionTierSpec
      }

      const editionClaimSummary = buildJsonLdEditionClaimSummary(artwork)
      if (editionClaimSummary?.length) {
        doc['artism:editionClaimSummary'] = editionClaimSummary
      }

      const originalEdition = buildJsonLdOriginalEditionFields(artwork)
      if (originalEdition) {
        doc['artism:originalEditionSize'] = originalEdition.originalEditionSize
        doc['artism:originalEditionApCount'] = originalEdition.originalEditionApCount
      }
    }
  }

  const provenanceConfidenceLevel = deriveJsonLdProvenanceConfidenceLevel(artwork)
  if (provenanceConfidenceLevel) {
    doc['artism:provenanceConfidenceLevel'] = provenanceConfidenceLevel
  }

  const provenanceClaims = getJsonLdProvenanceClaims(artwork)
  if (provenanceClaims?.length) {
    doc['artism:provenanceClaims'] = provenanceClaims
  }

  const relatedWork = buildJsonLdRelatedWorks(artwork, baseUrl)
  if (relatedWork?.length) {
    doc['artism:relatedWork'] = relatedWork
  }

  const embeddingMetadata = resolveEmbeddingMetadataList(artwork)
  if (embeddingMetadata.length > 0) {
    doc['artism:embeddings'] = embeddingMetadata.map(buildCorpusEmbeddingMetadata)
  }

  const visionAnalyses = buildCorpusVisionAnalyses(artwork)
  if (visionAnalyses?.length) {
    doc['artism:visionAnalyses'] = visionAnalyses
  }
}

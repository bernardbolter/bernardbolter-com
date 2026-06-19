import type { CollectionAfterReadHook } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { resolveOwnershipRegistryTier } from '@/lib/artwork/ownershipRegistryPublic'

type JsonRow = Record<string, unknown>

function asRows(value: unknown): JsonRow[] {
  return Array.isArray(value) ? (value as JsonRow[]) : []
}

function sanitizeOwnershipHistory(rows: unknown): JsonRow[] {
  return asRows(rows).map((row) => ({
    displayName: row.displayName,
    city: row.collectorVisible === true ? row.city : undefined,
    dateAcquired: row.dateAcquired,
    dateRelinquished: row.dateRelinquished,
    claimStatus: row.claimStatus,
    collectorVisible: row.collectorVisible,
  }))
}

function sanitizeProvenanceConfidenceLayer(rows: unknown): JsonRow[] {
  return asRows(rows).map((row) => ({
    claim: row.claim,
    confidenceLevel: row.confidenceLevel,
  }))
}

function sanitizeLoanHistory(rows: unknown): JsonRow[] {
  return asRows(rows).map((row) => ({
    institution: row.institution,
    dateOut: row.dateOut,
    dateReturned: row.dateReturned,
    eventId: row.eventId,
  }))
}

function sanitizeOwnershipRegistry(rows: unknown): JsonRow[] {
  return asRows(rows).map((tier) => {
    const resolved = resolveOwnershipRegistryTier(tier as Parameters<typeof resolveOwnershipRegistryTier>[0])
    const seriesTier =
      typeof tier.seriesEditionTier === 'object' && tier.seriesEditionTier !== null
        ? (tier.seriesEditionTier as JsonRow)
        : null

    return {
      seriesEditionTier: seriesTier
        ? {
            id: seriesTier.id,
            tierName: seriesTier.tierName,
            tierOrder: seriesTier.tierOrder,
            editionSize: seriesTier.editionSize,
            apCount: seriesTier.apCount,
            isOriginalTier: seriesTier.isOriginalTier,
            widthCm: seriesTier.widthCm,
            heightCm: seriesTier.heightCm,
            substrate: seriesTier.substrate,
            printTechnique: seriesTier.printTechnique,
          }
        : tier.seriesEditionTier,
      tierLabel: resolved.tierLabel,
      tierOrder: resolved.tierOrder,
      editionSize: resolved.editionSize,
      apCount: resolved.apCount,
      isOriginalTier: resolved.isOriginalTier,
      copies: asRows(tier.copies).map((copy) => ({
        copyNumber: copy.copyNumber,
        isArtistProof: copy.isArtistProof,
        claimStatus: copy.claimStatus,
        collectorVisible: copy.collectorVisible,
        dateAcquired: copy.dateAcquired,
        claimedCopyNumberKnown: copy.claimedCopyNumberKnown,
        ...(copy.collectorVisible === true && copy.owner ? { owner: copy.owner } : {}),
      })),
    }
  })
}

function sanitizeCurrentLocation(location: unknown): JsonRow | null {
  if (!location || typeof location !== 'object') return null
  const row = location as JsonRow
  const category = row.category
  if (!category) return null

  if (category === 'institution') {
    return {
      category,
      locationDetail: row.locationDetail,
    }
  }

  return { category }
}

/** Strip private commerce and provenance detail from public artwork reads. */
export const artworkAfterRead: CollectionAfterReadHook = async ({ doc, req }) => {
  if (isArtistOrAdmin(req.user)) return doc

  return {
    ...doc,
    currentLocation: sanitizeCurrentLocation(doc.currentLocation),
    ownershipHistory: sanitizeOwnershipHistory(doc.ownershipHistory),
    provenanceConfidenceLayer: sanitizeProvenanceConfidenceLayer(doc.provenanceConfidenceLayer),
    loanHistory: sanitizeLoanHistory(doc.loanHistory),
    ownershipRegistry: sanitizeOwnershipRegistry(doc.ownershipRegistry),
    askingPrice: undefined,
    salesRecord: undefined,
    consignmentDetails: undefined,
    totalRevenue: undefined,
  }
}

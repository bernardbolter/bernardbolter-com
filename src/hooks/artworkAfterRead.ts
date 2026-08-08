import type { CollectionAfterReadHook } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

type JsonRow = Record<string, unknown>

/** Top-level commerce / private fields — omit entirely for public reads (do not set `undefined`; RSC serializes that as `"$undefined"` and leaks field names). */
export const PRIVATE_ARTWORK_COMMERCE_FIELDS = [
  'askingPrice',
  'salesRecord',
  'consignmentDetails',
  'totalRevenue',
  'insuranceValue',
  'insuranceValueDate',
  'listingCurrency',
  'originalAskingPrice',
  'priceNotes',
  'artworkHolder',
  'provenanceNotes',
] as const

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

function sanitizeEditionTierCopies(rows: unknown): JsonRow[] {
  return asRows(rows).map((copy) => ({
    copyNumber: copy.copyNumber,
    isArtistProof: copy.isArtistProof,
    claimStatus: copy.claimStatus,
    collectorVisible: copy.collectorVisible,
    dateAcquired: copy.dateAcquired,
    claimedCopyNumberKnown: copy.claimedCopyNumberKnown,
    ...(copy.collectorVisible === true && copy.owner ? { owner: copy.owner } : {}),
  }))
}

function sanitizeDcsEditionTiers(rows: unknown): JsonRow[] {
  return asRows(rows).map((tier) => ({
    seriesTierKey: tier.seriesTierKey,
    tierName: tier.tierName,
    totalEditionSize: tier.totalEditionSize,
    printSubstrate: tier.printSubstrate,
    includesSupportingPrints: tier.includesSupportingPrints,
    isOriginalTier: tier.isOriginalTier,
    copies: sanitizeEditionTierCopies(tier.copies),
  }))
}

function sanitizeMegacitiesEditions(rows: unknown): JsonRow[] {
  return asRows(rows).map((tier) => ({
    seriesTierKey: tier.seriesTierKey,
    tier: tier.tier,
    dimensions: tier.dimensions,
    editionSize: tier.editionSize,
    arEnabled: tier.arEnabled,
    available: tier.available,
    notes: tier.notes,
    isOriginalTier: tier.isOriginalTier,
    copies: sanitizeEditionTierCopies(tier.copies),
  }))
}

function sanitizeOwnershipRegistry(rows: unknown): JsonRow[] {
  return asRows(rows).map((tier) => ({
    tierLabel: tier.tierLabel,
    tierOrder: tier.tierOrder,
    editionSize: tier.editionSize,
    apCount: tier.apCount,
    isOriginalTier: tier.isOriginalTier,
    dimensionUnit: tier.dimensionUnit,
    widthWhole: tier.widthWhole,
    widthFraction: tier.widthFraction,
    heightWhole: tier.heightWhole,
    heightFraction: tier.heightFraction,
    substrate: tier.substrate,
    printTechnique: tier.printTechnique,
    copies: sanitizeEditionTierCopies(tier.copies),
  }))
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

/** Drop private commerce keys so they never enter RSC flight / public JSON. */
export function omitPrivateArtworkCommerceFields<T extends Record<string, unknown>>(doc: T): T {
  const out = { ...doc } as Record<string, unknown>
  for (const key of PRIVATE_ARTWORK_COMMERCE_FIELDS) {
    delete out[key]
  }
  return out as T
}

/** Strip private commerce and provenance detail from public artwork reads. */
export const artworkAfterRead: CollectionAfterReadHook = async ({ doc, req }) => {
  if (isArtistOrAdmin(req.user)) return doc

  const base = omitPrivateArtworkCommerceFields(doc as Record<string, unknown>)
  const dcs = base.dcs as JsonRow | null | undefined
  const megacities = base.megacities as JsonRow | null | undefined
  const megacitiesPrint = megacities?.print as JsonRow | null | undefined

  return {
    ...base,
    currentLocation: sanitizeCurrentLocation(base.currentLocation),
    ownershipHistory: sanitizeOwnershipHistory(base.ownershipHistory),
    provenanceConfidenceLayer: sanitizeProvenanceConfidenceLayer(base.provenanceConfidenceLayer),
    loanHistory: sanitizeLoanHistory(base.loanHistory),
    ownershipRegistry: sanitizeOwnershipRegistry(base.ownershipRegistry),
    dcs: dcs
      ? {
          ...dcs,
          editionTiers: sanitizeDcsEditionTiers(dcs.editionTiers),
        }
      : dcs,
    megacities: megacities
      ? {
          ...megacities,
          print: megacitiesPrint
            ? {
                ...megacitiesPrint,
                editions: sanitizeMegacitiesEditions(megacitiesPrint.editions),
              }
            : megacitiesPrint,
        }
      : megacities,
  }
}

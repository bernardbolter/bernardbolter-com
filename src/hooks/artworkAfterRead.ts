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

/**
 * Provenance arrays. Payload field-level `access.read: false` omits scalars
 * but leaves array fields as `[]` after skipping the join. REST/anonymous
 * responses must delete these keys to match `askingPrice`.
 */
export const PRIVATE_ARTWORK_PROVENANCE_FIELDS = [
  'ownershipHistory',
  'loanHistory',
  'provenanceConfidenceLayer',
] as const

function asRows(value: unknown): JsonRow[] {
  return Array.isArray(value) ? (value as JsonRow[]) : []
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

export function omitPrivateArtworkProvenanceFields<T extends Record<string, unknown>>(doc: T): T {
  const out = { ...doc } as Record<string, unknown>
  for (const key of PRIVATE_ARTWORK_PROVENANCE_FIELDS) {
    delete out[key]
  }
  return out as T
}

/** Strip private commerce and provenance detail from public artwork reads. */
export const artworkAfterRead: CollectionAfterReadHook = async ({ doc, req, overrideAccess }) => {
  if (isArtistOrAdmin(req.user)) return doc

  let base = omitPrivateArtworkCommerceFields(doc as Record<string, unknown>)
  // SSR page fetch uses overrideAccess: true so the public projector can still
  // read provenance rows. Anonymous REST must omit the keys entirely.
  if (!overrideAccess) {
    base = omitPrivateArtworkProvenanceFields(base)
  }
  const dcs = base.dcs as JsonRow | null | undefined
  const megacities = base.megacities as JsonRow | null | undefined
  const megacitiesPrint = megacities?.print as JsonRow | null | undefined

  return {
    ...base,
    currentLocation: sanitizeCurrentLocation(base.currentLocation),
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

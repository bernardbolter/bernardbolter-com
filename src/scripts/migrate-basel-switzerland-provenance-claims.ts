/**
 * Enter Basel Switzerland provenance claims and the auctioned Collector's print copy.
 *
 * Usage: npx tsx src/scripts/migrate-basel-switzerland-provenance-claims.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

const BASEL_SLUG = 'basel-switzerland'

const PROVENANCE_CLAIMS = [
  {
    claim: 'Work created during a Gerrit Rietveld Akademie school trip to Basel, 2007',
    evidenceBasis: 'Artist account, direct experience',
    confidenceLevel: 'documented-fact',
  },
  {
    claim:
      'First exhibited at the Gerrit Rietveld Akademie, before the Christmas break, 2007 — printed on A3 sheets',
    evidenceBasis: 'Artist account, direct experience',
    confidenceLevel: 'documented-fact',
  },
  {
    claim:
      "A Collector's print copy was later exhibited in Amsterdam, at a separate exhibition from the Rietveld show",
    evidenceBasis: 'Artist account, direct experience',
    confidenceLevel: 'documented-fact',
  },
  {
    claim:
      'That copy was sold at auction by the artist directly, at the Amsterdam exhibition',
    evidenceBasis:
      'Artist account, direct experience — the artist conducted the sale personally',
    confidenceLevel: 'documented-fact',
  },
] as const

const AUCTIONED_COLLECTORS_COPY = {
  copyNumber: 'Sold at Amsterdam auction',
  isArtistProof: false,
  owner: null,
  claimStatus: 'unclaimed' as const,
  collectorVisible: false,
  dateAcquired: null,
  claimedCopyNumberKnown: false,
  notes:
    'Sold at auction by the artist personally, at a separate Amsterdam exhibition. Current owner not recorded at time of sale.',
}

const RELATED_DA_FEN_OIL = {
  relationshipType: 'derivative-oil-painting' as const,
  relatedWorkNote:
    'An oil painting interpretation of this composition exists as a separate Da Fen collaboration work, catalogued independently of this digital edition.',
}

function collectorsTierHasAuctionCopy(copies: unknown[] | null | undefined): boolean {
  if (!Array.isArray(copies)) return false
  return copies.some((copy) => {
    if (!copy || typeof copy !== 'object') return false
    const notes = (copy as { notes?: string | null }).notes
    return typeof notes === 'string' && notes.includes('Amsterdam auction')
  })
}

async function main() {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: BASEL_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const artwork = result.docs[0]
  if (!artwork) {
    throw new Error(`Artwork "${BASEL_SLUG}" not found`)
  }

  const editionTiers = artwork.dcs?.editionTiers ?? []
  const collectorsIndex = editionTiers.findIndex((tier) => tier.tierName === 'collectors-print')
  if (collectorsIndex < 0) {
    throw new Error('Basel collectors-print tier not found on dcs.editionTiers[]')
  }

  const collectorsTier = editionTiers[collectorsIndex]!
  const existingCopies = collectorsTier.copies ?? []
  const nextCopies = collectorsTierHasAuctionCopy(existingCopies)
    ? existingCopies
    : [...existingCopies, AUCTIONED_COLLECTORS_COPY]

  const nextEditionTiers = editionTiers.map((tier, index) =>
    index === collectorsIndex ? { ...tier, copies: nextCopies } : tier,
  )

  const existingRelated = artwork.relatedWorks ?? []
  const hasDaFenRelated = existingRelated.some(
    (row) => row?.relationshipType === 'derivative-oil-painting',
  )
  const nextRelatedWorks = hasDaFenRelated ? existingRelated : [...existingRelated, RELATED_DA_FEN_OIL]

  await payload.update({
    collection: 'artworks',
    id: artwork.id,
    data: {
      provenanceConfidenceLayer: [...PROVENANCE_CLAIMS],
      relatedWorks: nextRelatedWorks,
      dcs: {
        ...artwork.dcs,
        editionTiers: nextEditionTiers,
      },
    },
    overrideAccess: true,
    context: { skipEmbedding: true, skipSeriesEditionTierAutopopulate: true },
  })

  console.log(`✓ Updated ${BASEL_SLUG}:`)
  console.log(`  provenanceConfidenceLayer: ${PROVENANCE_CLAIMS.length} claims`)
  console.log(
    `  collectors-print copies: ${nextCopies.length} (${collectorsTierHasAuctionCopy(existingCopies) ? 'auction copy already present' : 'added auction copy'})`,
  )
  console.log(
    `  relatedWorks: ${nextRelatedWorks.length} (${hasDaFenRelated ? 'Da Fen entry already present' : 'added Da Fen note'})`,
  )

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

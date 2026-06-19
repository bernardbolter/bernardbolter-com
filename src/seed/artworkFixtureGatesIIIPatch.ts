/**
 * Artwork Fixture Patch — Gates of Perception III (ACH)
 * ======================================================
 * Updates the existing __fixture-gates-iii record to enrich the
 * ownershipRegistry with more tiers/copies and add currentLocation,
 * so every right-column section renders for testing.
 *
 * Run with: npx payload run src/seed/artworkFixtureGatesIIIPatch.ts
 * Or:       pnpm seed:artwork-fixture  (if script is wired)
 *
 * Requires __fixture-gates-iii to already exist — run artworkFixture.ts first.
 */
import { getPayload } from 'payload'
import config from '@payload-config'
import { ARTWORK_FIXTURE_SLUG } from '@/seed/artworkFixtureData'

async function seed() {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: ARTWORK_FIXTURE_SLUG } },
    limit: 1,
    overrideAccess: true,
  })

  if (!existing.docs[0]) {
    throw new Error(
      `${ARTWORK_FIXTURE_SLUG} not found. Run artworkFixture.ts first.`,
    )
  }

  const id = existing.docs[0].id

  await payload.update({
    collection: 'artworks',
    id,
    overrideAccess: true,
    context: { skipEmbedding: true },
    data: {
      hasEditions: 'limited' as const,

      // --- Status & location ---
      // Original painting stays in the artist's studio.
      // Tests: "Currently in artist's studio, Berlin" headline.
      // Tests: unclaimed appeal SUPPRESSED (studio rule).
      currentLocation: {
        category: 'artists-studio',
        locationDetail: 'Studio, Neukölln, Berlin',
      },

      // --- Provenance ---
      // All entries documented-fact → "Provenance: fully documented."
      provenanceOriginKnown: true,
      provenanceConfidenceLayer: [
        {
          claim: 'Work created in artist studio, Neukölln, Berlin, late autumn 2019',
          evidenceBasis: 'Artist catalogue record and studio photographs',
          confidenceLevel: 'documented-fact',
        },
        {
          claim: 'Exhibited at Galerie Nord, Berlin, September–November 2022',
          evidenceBasis: 'Exhibition invitation card and installation photography',
          confidenceLevel: 'documented-fact',
        },
        {
          claim: "Original work remains in artist's possession",
          evidenceBasis: 'Artist confirmation',
          confidenceLevel: 'documented-fact',
        },
      ],

      // Empty ownership history — original has never changed hands.
      // Unclaimed appeal suppressed because currentLocation is artists-studio.
      ownershipHistory: [],

      // No loan history — loan section absent from page.
      loanHistory: [],

      // --- Ownership registry ---
      // Tier 1 (Small giclée, 10+2AP): 2 of 10 claimed, APs suppressed
      // Tier 2 (Medium giclée, 10+2AP): 6 of 10 claimed, APs suppressed
      // Tier 3 (Large giclée, 5+1AP): 0 claimed — "Edition of 5 — available"
      ownershipRegistry: [
        {
          tierLabel: 'Small giclée',
          tierOrder: 1,
          editionSize: 10,
          apCount: 2,
          copies: [
            {
              copyNumber: '3/10',
              isArtistProof: false,
              owner: 'Private collection, Munich',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2023-02',
              claimedCopyNumberKnown: true,
            },
            {
              copyNumber: '7/10',
              isArtistProof: false,
              owner: 'Private collection',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2023-08',
              claimedCopyNumberKnown: false,
            },
            {
              copyNumber: 'AP 1/2',
              isArtistProof: true,
              owner: null,
              claimStatus: 'artist-held',
              collectorVisible: false,
              dateAcquired: null,
              claimedCopyNumberKnown: false,
            },
            {
              copyNumber: 'AP 2/2',
              isArtistProof: true,
              owner: null,
              claimStatus: 'artist-held',
              collectorVisible: false,
              dateAcquired: null,
              claimedCopyNumberKnown: false,
            },
          ],
        },
        {
          tierLabel: 'Medium giclée',
          tierOrder: 2,
          editionSize: 10,
          apCount: 2,
          copies: [
            {
              copyNumber: '1/10',
              isArtistProof: false,
              owner: 'S. Hartmann',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2022-11',
              claimedCopyNumberKnown: true,
            },
            {
              copyNumber: '2/10',
              isArtistProof: false,
              owner: 'Private collection, Vienna',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2023-01',
              claimedCopyNumberKnown: true,
            },
            {
              copyNumber: '5/10',
              isArtistProof: false,
              owner: 'Private collection, Berlin',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2023-04',
              claimedCopyNumberKnown: true,
            },
            {
              copyNumber: '6/10',
              isArtistProof: false,
              owner: 'Private collection',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2023-06',
              claimedCopyNumberKnown: false,
            },
            {
              copyNumber: '8/10',
              isArtistProof: false,
              owner: 'T. Lehmann',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2023-09',
              claimedCopyNumberKnown: true,
            },
            {
              copyNumber: '10/10',
              isArtistProof: false,
              owner: 'Private collection, Hamburg',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2024-02',
              claimedCopyNumberKnown: true,
            },
            {
              copyNumber: 'AP 1/2',
              isArtistProof: true,
              owner: null,
              claimStatus: 'artist-held',
              collectorVisible: false,
              dateAcquired: null,
              claimedCopyNumberKnown: false,
            },
            {
              copyNumber: 'AP 2/2',
              isArtistProof: true,
              owner: null,
              claimStatus: 'artist-held',
              collectorVisible: false,
              dateAcquired: null,
              claimedCopyNumberKnown: false,
            },
          ],
        },
        {
          tierLabel: 'Large giclée',
          tierOrder: 3,
          editionSize: 5,
          apCount: 1,
          copies: [],
          // Zero claimed → "Edition of 5 — available"
        },
      ],

    },
  })

  console.log('✓ Gates III patch applied:', id)
  console.log('\nRight column now tests at /preview/artwork/__fixture-gates-iii:')
  console.log('  Status:     Currently in artist\'s studio, Berlin')
  console.log('  Provenance: Fully documented')
  console.log('  Ownership:  Empty — unclaimed appeal SUPPRESSED (studio rule)')
  console.log('  Loan hist:  Absent')
  console.log('  Registry T1 (Small giclée):  2/10 claimed, APs suppressed')
  console.log('  Registry T2 (Medium giclée): 6/10 claimed, APs suppressed')
  console.log('  Registry T3 (Large giclée):  0/5  — available')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Gates III patch failed:', err)
    process.exit(1)
  })

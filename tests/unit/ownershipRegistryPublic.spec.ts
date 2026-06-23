import { describe, expect, it } from 'vitest'

import {
  buildOriginalTierDisplayCopies,
  buildPublicEditionTiers,
  getOriginalTier,
} from '@/lib/artwork/ownershipRegistryPublic'
import type { Artwork } from '@/payload-types'

function artwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: 1,
    title: 'Gates III',
    slug: '__fixture-gates-iii',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as Artwork
}

describe('ownershipRegistryPublic', () => {
  it('summarises zero claimed as edition available', () => {
    const tiers = buildPublicEditionTiers(
      artwork({
        ownershipRegistry: [
          {
            tierLabel: 'Large giclée',
            tierOrder: 3,
            editionSize: 5,
            apCount: 1,
            copies: [{ copyNumber: 'AP', isArtistProof: true, claimStatus: 'artist-held' }],
          },
        ],
      }),
    )

    expect(tiers[0]?.headerSummary).toBe('Edition of 5 — available')
    expect(tiers[0]?.claimedRows).toHaveLength(0)
    expect(tiers[0]?.apRow).toBeNull()
  })

  it('summarises partial claims and suppresses AP rows', () => {
    const tiers = buildPublicEditionTiers(
      artwork({
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
              },
              {
                copyNumber: '7/10',
                isArtistProof: false,
                owner: 'Private collection',
                claimStatus: 'claimed-confirmed',
                collectorVisible: true,
              },
              {
                copyNumber: 'AP 1/2',
                isArtistProof: true,
                claimStatus: 'artist-held',
              },
            ],
          },
        ],
      }),
    )

    expect(tiers[0]?.headerSummary).toBe('2 of 10 claimed')
    expect(tiers[0]?.claimedRows).toHaveLength(2)
    expect(tiers[0]?.apRow).toBeNull()
  })

  it('shows AP only when all numbered copies are claimed', () => {
    const tiers = buildPublicEditionTiers(
      artwork({
        ownershipRegistry: [
          {
            tierLabel: 'Original edition',
            tierOrder: 1,
            editionSize: 1,
            apCount: 1,
            copies: [
              {
                copyNumber: '1/1',
                isArtistProof: false,
                owner: 'Private collection',
                claimStatus: 'claimed-confirmed',
                collectorVisible: true,
              },
              {
                copyNumber: 'AP',
                isArtistProof: true,
                claimStatus: 'artist-held',
              },
            ],
          },
        ],
      }),
    )

    expect(tiers[0]?.headerSummary).toBe('1 of 1 claimed — edition complete')
    expect(tiers[0]?.apRow).toEqual({
      copyNumber: 'AP',
      ownerLabel: 'Held by the artist',
      isArtistProof: true,
    })
  })

  it('builds tier claim links with slug and tier label', () => {
    const tiers = buildPublicEditionTiers(
      artwork({
        ownershipRegistry: [
          {
            tierLabel: 'Small giclée',
            tierOrder: 1,
            editionSize: 10,
            copies: [],
          },
        ],
      }),
    )

    expect(tiers[0]?.claimHref).toBe(
      '/contact?claim=__fixture-gates-iii&tier=Small+gicl%C3%A9e&title=Gates+III',
    )
  })

  it('resolves tier metadata from dcs.editionTiers copies', () => {
    const tiers = buildPublicEditionTiers(
      artwork({
        dcs: {
          editionTiers: [
            {
              tierName: 'collectors-print',
              totalEditionSize: 9,
              printSubstrate: 'aluminum-mount',
              copies: [],
            },
          ],
        },
      } as Artwork),
    )

    expect(tiers[0]?.tierLabel).toBe("Collector's print")
    expect(tiers[0]?.headerSummary).toBe('Edition of 9 — available')
  })

  it('prefers embedded series tier spec over local dcs fields when seriesTierKey is set', () => {
    const tiers = buildPublicEditionTiers(
      artwork({
        series: {
          id: 1,
          slug: 'digital-city-series',
          name: 'Digital City Series',
          status: 'published',
          editionTiers: [
            {
              tierKey: 'collectors-print',
              tierName: "Collector's print",
              tierOrder: 2,
              editionSize: 6,
              apCount: 2,
              substrate: 'aluminum-mount',
              printTechnique: 'pigment-print',
              dimensionUnit: 'cm',
              widthWhole: 80,
              heightWhole: 120,
            },
          ],
          updatedAt: '',
          createdAt: '',
        },
        dcs: {
          editionTiers: [
            {
              tierName: 'small-print',
              seriesTierKey: 'collectors-print',
              totalEditionSize: 200,
              printSubstrate: 'paper',
              copies: [
                {
                  copyNumber: '1/6',
                  isArtistProof: false,
                  owner: 'Private collection',
                  claimStatus: 'claimed-confirmed',
                  collectorVisible: true,
                },
              ],
            },
          ],
        },
      } as Artwork),
    )

    expect(tiers[0]?.tierLabel).toBe("Collector's print")
    expect(tiers[0]?.headerSummary).toBe('1 of 6 claimed')
    expect(tiers[0]?.claimedRows).toHaveLength(1)
    expect(tiers[0]?.specLine).toBe(
      'Edition of 6 + 2 AP · 80 × 120 cm · Pigment print · on Aluminum mount',
    )
  })

  it('builds spec line from ownershipRegistry inline fields', () => {
    const tiers = buildPublicEditionTiers(
      artwork({
        ownershipRegistry: [
          {
            tierLabel: 'Large giclée',
            tierOrder: 3,
            editionSize: 5,
            apCount: 1,
            dimensionUnit: 'cm',
            widthWhole: 75,
            heightWhole: 100,
            substrate: 'paper',
            printTechnique: 'giclee',
            copies: [],
          },
        ],
      }),
    )

    expect(tiers[0]?.specLine).toBe(
      'Edition of 5 + 1 AP · 75 × 100 cm · Giclée · on Paper',
    )
  })

  it('reads isOriginalTier from embedded series tier and excludes that tier from the accordion', () => {
    const dcsArtwork = artwork({
      series: {
        id: 1,
        slug: 'digital-city-series',
        name: 'Digital City Series',
        status: 'published',
        editionTiers: [
          {
            tierKey: 'monumental',
            tierName: 'Monumental',
            tierOrder: 1,
            editionSize: 3,
            apCount: 1,
            isOriginalTier: true,
          },
        ],
        updatedAt: '',
        createdAt: '',
      },
      dcs: {
        editionTiers: [
          {
            tierName: 'monumental',
            seriesTierKey: 'monumental',
            totalEditionSize: 3,
            isOriginalTier: false,
            copies: [],
          },
          {
            tierName: 'small-print',
            totalEditionSize: 200,
            copies: [],
          },
        ],
      },
    } as Artwork)

    const tiers = buildPublicEditionTiers(dcsArtwork)

    expect(tiers).toHaveLength(1)
    expect(tiers[0]?.tierLabel).toBe('Small print')
    expect(getOriginalTier(dcsArtwork)?.tierLabel).toBe('Monumental')
  })

  it('falls back to embedded series edition tiers when artwork has no per-artwork tier rows', () => {
    const stockholmLike = artwork({
      series: {
        id: 1,
        slug: 'digital-city-series',
        name: 'Digital City Series',
        status: 'published',
        editionTiers: [
          {
            tierKey: 'monumental',
            tierName: 'Monumental Edition',
            tierOrder: 1,
            editionSize: 3,
            apCount: 1,
            isOriginalTier: true,
            dimensionUnit: 'cm',
            widthWhole: 121,
            heightWhole: 121,
            substrate: 'aluminum-mount',
            printTechnique: 'pigment-print',
          },
          {
            tierKey: 'collectors-print',
            tierName: "Collector's print",
            tierOrder: 2,
            editionSize: 6,
            apCount: 2,
            dimensionUnit: 'cm',
            widthWhole: 80,
            heightWhole: 120,
            substrate: 'aluminum-mount',
            printTechnique: 'pigment-print',
          },
          {
            tierKey: 'small-print',
            tierName: 'Small print',
            tierOrder: 3,
            editionSize: 200,
            apCount: 0,
            dimensionUnit: 'cm',
            widthWhole: 40,
            heightWhole: 60,
            substrate: 'paper',
            printTechnique: 'pigment-print',
          },
        ],
        updatedAt: '',
        createdAt: '',
      },
      dcs: {
        editionTiers: [],
      },
    } as Artwork)

    const tiers = buildPublicEditionTiers(stockholmLike)

    expect(tiers).toHaveLength(2)
    expect(tiers.map((tier) => tier.tierLabel)).toEqual(["Collector's print", 'Small print'])
    expect(tiers[0]?.specLine).toContain('80 × 120 cm')
    expect(getOriginalTier(stockholmLike)?.tierLabel).toBe('Monumental Edition')
  })

  it('computes claimed-count from copies[] only, not editionsRemaining', () => {
    const tiers = buildPublicEditionTiers(
      artwork({
        dcs: {
          editionTiers: [
            {
              tierName: 'collectors-print',
              totalEditionSize: 9,
              editionsRemaining: 8,
              copies: [],
            },
          ],
        },
      } as Artwork),
    )

    expect(tiers[0]?.headerSummary).toBe('Edition of 9 — available')
    expect(tiers[0]?.claimedRows).toHaveLength(0)
  })

  it('excludes isOriginalTier tiers from the editions accordion', () => {
    const tiers = buildPublicEditionTiers(
      artwork({
        ownershipRegistry: [
          {
            tierLabel: 'Original edition',
            tierOrder: 1,
            editionSize: 3,
            apCount: 1,
            isOriginalTier: true,
            copies: [],
          },
          {
            tierLabel: 'Small print',
            tierOrder: 2,
            editionSize: 200,
            copies: [],
          },
        ],
      }),
    )

    expect(tiers).toHaveLength(1)
    expect(tiers[0]?.tierLabel).toBe('Small print')
  })

  it('shows unclaimed numbered copies in the original tier block', () => {
    const copies = buildOriginalTierDisplayCopies({
      tierLabel: 'Original edition',
      editionSize: 3,
      apCount: 1,
      copies: [
        {
          copyNumber: '1/3',
          isArtistProof: false,
          owner: 'Private collection, Berlin',
          claimStatus: 'claimed-confirmed',
          collectorVisible: true,
        },
        {
          copyNumber: 'AP',
          isArtistProof: true,
          claimStatus: 'artist-held',
        },
      ],
    })

    expect(copies.map((copy) => copy.copyNumber)).toEqual(['1/3', '2/3', '3/3'])
    expect(copies[1]?.claimStatus).toBe('unclaimed')
    expect(copies.some((copy) => copy.copyNumber === 'AP')).toBe(false)
  })
})

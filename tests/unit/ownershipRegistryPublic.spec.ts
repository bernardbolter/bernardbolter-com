import { describe, expect, it } from 'vitest'

import {
  buildOriginalTierDisplayCopies,
  buildPublicEditionTiers,
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

  it('resolves tier metadata from a populated seriesEditionTier relation', () => {
    const tiers = buildPublicEditionTiers(
      artwork({
        ownershipRegistry: [
          {
            seriesEditionTier: {
              id: 10,
              tierName: 'Collectors print',
              tierOrder: 2,
              editionSize: 9,
              apCount: 2,
              isOriginalTier: false,
              series: 1,
              updatedAt: '',
              createdAt: '',
            },
            copies: [],
          },
        ],
      }),
    )

    expect(tiers[0]?.tierLabel).toBe('Collectors print')
    expect(tiers[0]?.headerSummary).toBe('Edition of 9 — available')
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

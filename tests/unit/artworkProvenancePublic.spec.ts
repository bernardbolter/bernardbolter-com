import { describe, expect, it } from 'vitest'

import {
  buildCurrentHolderLine,
  buildOwnershipClaimHref,
  buildOwnershipDisplay,
  buildOwnershipTimelineRows,
  getPublicProvenanceClaims,
  hasUnclaimedOwnershipAppeal,
  shouldShowOwnershipSection,
} from '@/lib/artwork/artworkProvenancePublic'
import type { Artist, Artwork } from '@/payload-types'

const artist = {
  workCity1: 'Berlin',
} as Artist

function artwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: 1,
    title: 'Deutsche Stadt',
    slug: 'deutsche-stadt',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as Artwork
}

describe('getPublicProvenanceClaims', () => {
  it('partitions claims by confidence and excludes speculation', () => {
    const result = getPublicProvenanceClaims(
      artwork({
        provenanceConfidenceLayer: [
          { claim: 'Documented fact', confidenceLevel: 'documented-fact' },
          { claim: 'Inferred claim', confidenceLevel: 'credible-inference' },
          { claim: 'Institution note', confidenceLevel: 'institutional-assertion' },
          { claim: 'Hidden guess', confidenceLevel: 'speculation' },
        ],
      }),
    )

    expect(result.prominent).toHaveLength(2)
    expect(result.demoted).toHaveLength(1)
    expect(result.hasDocumentedFact).toBe(true)
    expect(result.hasCredibleInference).toBe(true)
    expect(result.prominent.map((row) => row.claim)).not.toContain('Hidden guess')
    expect(result.demoted[0]?.claim).toBe('Institution note')
  })
})

describe('ownership display', () => {
  it('builds claim contact href with encoded params', () => {
    expect(buildOwnershipClaimHref({ slug: 'deutsche-stadt', title: 'Deutsche Stadt' })).toBe(
      '/contact?claim=deutsche-stadt&title=Deutsche+Stadt',
    )
  })

  it('shows ownership section when currentLocation is present', () => {
    expect(
      shouldShowOwnershipSection(
        artwork({ currentLocation: { category: 'private-collection' } }),
      ),
    ).toBe(true)
    expect(
      shouldShowOwnershipSection(
        artwork({ currentLocation: { category: 'artists-studio' } }),
      ),
    ).toBe(true)
    expect(shouldShowOwnershipSection(artwork())).toBe(false)
  })

  it('renders current holder for artist studio with city', () => {
    expect(
      buildCurrentHolderLine(
        artwork({ currentLocation: { category: 'artists-studio' } }),
        artist,
      ),
    ).toBe("Currently in artist's studio, Berlin")
  })

  it('renders visible current owner for private collection', () => {
    expect(
      buildCurrentHolderLine(
        artwork({
          currentLocation: { category: 'private-collection' },
          ownershipHistory: [
            {
              displayName: 'Jane Doe',
              city: 'London',
              dateAcquired: '2019-04-01',
              collectorVisible: true,
            },
          ],
        }),
        artist,
      ),
    ).toBe('Jane Doe, London')
  })

  it('renders generic private collection when current owner is not visible', () => {
    expect(
      buildCurrentHolderLine(
        artwork({
          currentLocation: { category: 'private-collection' },
          ownershipHistory: [
            {
              displayName: 'Hidden Name',
              city: 'Paris',
              collectorVisible: false,
            },
          ],
        }),
        artist,
      ),
    ).toBe('Private collection')
  })

  it('renders on-loan status headline', () => {
    expect(
      buildCurrentHolderLine(
        artwork({
          currentLocation: { category: 'on-loan' },
        }),
        artist,
      ),
    ).toBe('Currently on loan')
  })

  it('renders consignment availability headline', () => {
    expect(
      buildCurrentHolderLine(
        artwork({
          availabilityStatus: 'on-consignment',
          galleryReference: 'Galerie Nord',
        }),
        artist,
      ),
    ).toBe('Available via Galerie Nord')
  })

  it('renders timeline only for visible entries', () => {
    const rows = buildOwnershipTimelineRows(
      artwork({
        ownershipHistory: [
          {
            displayName: 'First Owner',
            city: 'Berlin',
            dateAcquired: '2015',
            dateRelinquished: '2020',
            collectorVisible: true,
          },
          {
            displayName: 'Secret Owner',
            city: 'Paris',
            dateAcquired: '2020',
            collectorVisible: false,
          },
        ],
      }),
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.text).toBe('First Owner · Berlin · 2015')
    expect(rows[0]?.text).not.toContain('Secret Owner')
  })

  it('shows unclaimed appeal only without confirmed owners outside the studio', () => {
    expect(hasUnclaimedOwnershipAppeal(artwork())).toBe(true)
    expect(
      hasUnclaimedOwnershipAppeal(
        artwork({
          ownershipHistory: [{ claimStatus: 'unclaimed' }],
        }),
      ),
    ).toBe(true)
    expect(
      hasUnclaimedOwnershipAppeal(
        artwork({
          currentLocation: { category: 'artists-studio' },
          ownershipHistory: [{ claimStatus: 'unclaimed' }],
        }),
      ),
    ).toBe(false)
    expect(
      hasUnclaimedOwnershipAppeal(
        artwork({
          ownershipHistory: [
            { claimStatus: 'unclaimed' },
            { claimStatus: 'claimed-confirmed', displayName: 'Known Owner', collectorVisible: true },
          ],
        }),
      ),
    ).toBe(false)
    expect(
      hasUnclaimedOwnershipAppeal(
        artwork({
          currentLocation: { category: 'private-collection' },
          ownershipHistory: [
            {
              claimStatus: 'claimed-confirmed',
              displayName: 'Private collection, Zurich',
              collectorVisible: true,
            },
          ],
        }),
      ),
    ).toBe(false)
  })

  it('builds full ownership display with appeal link', () => {
    const display = buildOwnershipDisplay(
      artwork({
        currentLocation: { category: 'private-collection' },
        provenanceOriginKnown: false,
        ownershipHistory: [{ claimStatus: 'unclaimed', collectorVisible: false }],
      }),
      artist,
    )

    expect(display.showSection).toBe(true)
    expect(display.showOriginHonesty).toBe(true)
    expect(display.showUnclaimedAppeal).toBe(true)
    expect(display.claimContactHref).toContain('claim=deutsche-stadt')
    expect(display.claimContactHref).toContain('title=Deutsche')
  })
})

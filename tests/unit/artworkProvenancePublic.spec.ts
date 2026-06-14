import { describe, expect, it } from 'vitest'

import {
  buildCurrentHolderLine,
  buildOwnershipClaimHref,
  buildOwnershipDisplay,
  buildOwnershipTimelineRows,
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

describe('ownership display', () => {
  it('builds claim contact href with encoded params', () => {
    expect(buildOwnershipClaimHref({ slug: 'deutsche-stadt', title: 'Deutsche Stadt' })).toBe(
      '/contact?claim=deutsche-stadt&title=Deutsche+Stadt',
    )
  })

  it('shows ownership section for visible entries, unknown origin, or artist studio', () => {
    expect(
      shouldShowOwnershipSection(
        artwork({
          ownershipHistory: [{ collectorVisible: true, displayName: 'A Collector' }],
        }),
      ),
    ).toBe(true)
    expect(shouldShowOwnershipSection(artwork({ provenanceOriginKnown: false }))).toBe(true)
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
    ).toBe("Currently in the artist's studio, Berlin")
  })

  it('renders visible current owner with year', () => {
    expect(
      buildCurrentHolderLine(
        artwork({
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
    ).toBe('Currently held by Jane Doe, London · since 2019')
  })

  it('renders generic private collection when current owner is not visible', () => {
    expect(
      buildCurrentHolderLine(
        artwork({
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
    ).toBe('Currently in a private collection')
  })

  it('appends on-loan suffix to current holder line', () => {
    expect(
      buildCurrentHolderLine(
        artwork({
          currentLocation: { category: 'on-loan' },
          ownershipHistory: [{ collectorVisible: false }],
        }),
        artist,
      ),
    ).toBe('Currently in a private collection · currently on loan')
  })

  it('renders timeline only with two or more entries and hides private names', () => {
    const rows = buildOwnershipTimelineRows(
      artwork({
        yearCreated: 2010,
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

    expect(rows).toHaveLength(3)
    expect(rows[0]?.text).toBe("Artist's studio · 2010–2015")
    expect(rows[1]?.text).toBe('First Owner · Berlin · 2015–2020')
    expect(rows[2]?.text).toBe('Private collection · 2020–present')
    expect(rows[2]?.text).not.toContain('Secret Owner')
    expect(rows[2]?.text).not.toContain('Paris')
  })

  it('shows unclaimed appeal only for open unclaimed entries outside the studio', () => {
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
          ownershipHistory: [{ claimStatus: 'unclaimed', dateRelinquished: '2020' }],
        }),
      ),
    ).toBe(false)
  })

  it('builds full ownership display with appeal link', () => {
    const display = buildOwnershipDisplay(
      artwork({
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

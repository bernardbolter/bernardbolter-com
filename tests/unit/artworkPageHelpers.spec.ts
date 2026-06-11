import { describe, expect, it } from 'vitest'

import { getArtworkExhibitionEvents } from '@/lib/artwork/artworkExhibitionEvents'
import {
  deriveProvenanceConfidenceSummary,
  provenanceConfidenceStatement,
} from '@/lib/artwork/artworkProvenancePublic'
import { formatArtworkYearRange, resolveScaleLabel } from '@/lib/artwork/artworkLabels'
import { resolveTopLevelSeries } from '@/lib/artwork/resolveTopLevelSeries'
import { labelForSameAsUri } from '@/lib/artwork/sameAsDomainLabel'
import type { Artwork, Event, Series } from '@/payload-types'

describe('artwork page helpers', () => {
  it('resolves top-level series through parent chain', () => {
    const parent = { id: 1, name: 'A Colorful History', slug: 'a-colorful-history' } as Series
    const child = { id: 2, name: 'Gates', slug: 'gates', parentSeries: parent } as Series
    expect(resolveTopLevelSeries(child).slug).toBe('a-colorful-history')
  })

  it('formats year range', () => {
    expect(formatArtworkYearRange({ yearCreated: 2018, yearCompleted: 2020 })).toBe('2018–2020')
    expect(formatArtworkYearRange({ yearCreated: 2019, yearCompleted: null })).toBe('2019')
  })

  it('maps size tier labels', () => {
    expect(resolveScaleLabel({ sizeTier: 'xl' })).toBe('Large-scale')
  })

  it('labels sameAs domains', () => {
    expect(labelForSameAsUri('https://www.artsy.net/artwork/example')).toBe('Artsy')
  })

  it('filters exhibition events by type', () => {
    const exhibition = {
      id: 1,
      title: 'Solo show',
      slug: 'solo',
      eventType: 'solo-exhibition',
      startDate: '2019-06-01',
      yearStart: 2019,
      status: 'published',
    } as Event
    const talk = {
      id: 2,
      title: 'Talk',
      slug: 'talk',
      eventType: 'talk-panel',
      startDate: '2020-01-01',
      status: 'published',
    } as Event

    const artwork = {
      events: { docs: [talk, exhibition] },
    } as Artwork

    const rows = getArtworkExhibitionEvents(artwork)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.event.slug).toBe('solo')
  })

  it('derives provenance confidence summary', () => {
    expect(
      deriveProvenanceConfidenceSummary({
        provenanceOriginKnown: false,
        provenanceConfidenceLayer: [],
      }),
    ).toBe('undocumented')
    expect(provenanceConfidenceStatement('partial')).toBe('Provenance: partially documented')
  })
})

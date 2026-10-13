import { describe, expect, it } from 'vitest'

import { buildVersoRecordExtras } from '@/lib/artwork/versoRecordExtras'
import type { Artwork } from '@/payload-types'

function artwork(partial: Partial<Artwork> & Pick<Artwork, 'id' | 'slug'>): Artwork {
  return {
    title: partial.title ?? partial.slug,
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  } as Artwork
}

describe('buildVersoRecordExtras', () => {
  it('projects public provenance claims without evidenceBasis', () => {
    const extras = buildVersoRecordExtras(
      artwork({
        id: 1,
        slug: 'oranienburger-tor-1867',
        provenanceOriginKnown: true,
        provenanceConfidenceLayer: [
          {
            claim: 'Shown at Prem Arts, 2017',
            confidenceLevel: 'documented-fact',
            evidenceBasis: 'invoice in studio file',
          },
          {
            claim: 'Possibly earlier sale',
            confidenceLevel: 'speculation',
          },
        ],
      }),
    )

    // Speculative rows stay out of public claims but still mark the summary partial.
    expect(extras.provenanceSummary).toBe('Provenance: partially documented')
    expect(extras.provenanceClaims).toEqual([
      { claim: 'Shown at Prem Arts, 2017', inferred: false },
    ])
    expect(JSON.stringify(extras)).not.toContain('evidenceBasis')
    expect(JSON.stringify(extras)).not.toContain('invoice')
  })

  it('slim exhibition lines from joined events', () => {
    const extras = buildVersoRecordExtras(
      artwork({
        id: 2,
        slug: 'skate-city',
        events: {
          docs: [
            {
              id: 9,
              title: 'Megacities',
              slug: 'megacities-2020',
              eventType: 'group-exhibition',
              yearStart: 2020,
              startDate: '2020-06-01',
              venueName: 'Circylar Gallery',
              venueCity: 'Berlin',
              hasPage: true,
            } as never,
          ],
          hasNextPage: false,
        },
      }),
    )

    expect(extras.exhibitions).toEqual([
      {
        year: 2020,
        title: 'Megacities',
        href: '/events/megacities-2020',
        venue: 'Circylar Gallery, Berlin',
      },
    ])
  })
})

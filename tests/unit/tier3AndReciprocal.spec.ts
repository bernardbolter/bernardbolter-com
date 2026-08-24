import { describe, expect, it } from 'vitest'

import { artworkHasVisionTier, computeAvailableTiers } from '@/lib/corpus/availableTiers'
import { buildTierMap } from '@/lib/corpus/tierMap'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'
import type { Artist, Artwork } from '@/payload-types'

const baseUrl = 'https://bernardbolter.com'

function artwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: 10,
    title: 'Antiquity',
    slug: 'antiquity',
    status: 'published',
    yearCreated: 2008,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Artwork
}

const artist = {
  id: 1,
  statementThroughlines: [
    {
      text: 'Invented antiquity across the archive.',
      slug: 'invented-antiquity',
      visibility: 'public',
      linkedArtworkSlugs: [10],
    },
  ],
  bioTimelineEntries: [],
} as Artist

describe('Tier 3 availability', () => {
  it('includes Tier 3 in availableTiers and tierMap only when vision text exists', () => {
    const withVision = artwork({
      visionAnalyses: [{ id: 'v1', text: 'A reading.', model: 'claude', date: '2024-01-01' }],
    })
    const without = artwork()

    expect(artworkHasVisionTier(withVision)).toBe(true)
    expect(computeAvailableTiers(withVision, 0)).toMatchObject({ '3': true, '1': true, '4': true })
    expect(computeAvailableTiers(without, 0)).not.toHaveProperty('3')

    const withMap = buildArtworkJsonLd(withVision, null, {
      baseUrl,
      includeTraversalLinks: true,
    })
    expect(withMap['art-official:tierMap']).toHaveProperty('3')

    const withoutMap = buildArtworkJsonLd(without, null, {
      baseUrl,
      includeTraversalLinks: true,
    })
    expect(withoutMap['art-official:tierMap']).not.toHaveProperty('3')
  })

  it('corpus-level tierMap advertises Tier 3 HTML urlTemplate by default', () => {
    expect(buildTierMap(baseUrl)['3']).toMatchObject({
      urlTemplate: `${baseUrl}/{slug}/vision`,
      depth: 'vision',
    })
    expect(buildTierMap(baseUrl, { includeVisionTier: false })).not.toHaveProperty('3')
  })
})

describe('Tier 4 reciprocal links', () => {
  it('emits relatedByThroughline from live reverse lookup', () => {
    const doc = buildArtworkJsonLd(artwork(), null, {
      baseUrl,
      includeTraversalLinks: true,
      artist,
    })
    expect(doc['art-official:relatedByThroughline']).toEqual([
      {
        name: 'Invented antiquity across the archive.',
        url: `${baseUrl}/statement/throughlines/invented-antiquity`,
      },
    ])
    expect(doc).not.toHaveProperty('art-official:relatedByBioEvent')
  })
})

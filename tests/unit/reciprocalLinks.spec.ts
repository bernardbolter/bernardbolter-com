import { describe, expect, it } from 'vitest'

import {
  artworkHasThroughlineConnections,
  findRelatedBioEvents,
  findRelatedThroughlines,
} from '@/lib/artist/reciprocalLinks'
import type { Artist, Artwork } from '@/payload-types'

const baseUrl = 'https://bernardbolter.com'

const venice = { id: 10, slug: 'venice-biennale-2007' } as Artwork
const munster = { id: 11, slug: 'skulptur-projekte-m-nster-2007' } as Artwork
const unrelated = { id: 99, slug: 'antiquity' } as Artwork

const artist = {
  id: 1,
  name: 'Bernard Bolter',
  slug: 'bernard-bolter',
  bioTimelineEntries: [
    {
      id: 'bio-1',
      text: 'Visited Münster for Skulptur Projekte.',
      slug: 'munster-2007-visit',
      visibility: 'public',
      linkedArtworkSlugs: [11],
    },
    {
      id: 'bio-private',
      text: 'Private note',
      slug: 'private-note',
      visibility: 'private',
      linkedArtworkSlugs: [10],
    },
  ],
  statementThroughlines: [
    {
      id: 'tl-1',
      text: 'Venice and Münster as paired encounters of invented antiquity.',
      slug: 'venice-munster-2007',
      visibility: 'public',
      linkedArtworkSlugs: [10, munster],
    },
  ],
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
} as Artist

describe('reciprocalLinks', () => {
  it('finds throughlines by artwork id or populated relation', () => {
    expect(findRelatedThroughlines(artist, venice, baseUrl)).toEqual([
      {
        name: 'Venice and Münster as paired encounters of invented antiquity.',
        url: `${baseUrl}/statement/throughlines/venice-munster-2007`,
      },
    ])
    expect(findRelatedThroughlines(artist, munster, baseUrl)).toHaveLength(1)
    expect(findRelatedThroughlines(artist, unrelated, baseUrl)).toEqual([])
  })

  it('finds public bio events and skips private', () => {
    expect(findRelatedBioEvents(artist, munster, baseUrl)).toEqual([
      {
        name: 'Visited Münster for Skulptur Projekte.',
        url: `${baseUrl}/bio/entries/munster-2007-visit`,
      },
    ])
    expect(findRelatedBioEvents(artist, venice, baseUrl)).toEqual([])
  })

  it('Tier 1 signal is true when either reverse lookup hits', () => {
    expect(artworkHasThroughlineConnections(artist, venice)).toBe(true)
    expect(artworkHasThroughlineConnections(artist, munster)).toBe(true)
    expect(artworkHasThroughlineConnections(artist, unrelated)).toBe(false)
    expect(artworkHasThroughlineConnections(null, venice)).toBe(false)
  })
})

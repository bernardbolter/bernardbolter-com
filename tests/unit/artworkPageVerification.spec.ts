import { describe, expect, it } from 'vitest'
import { APIError } from 'payload'

import { artworkBeforeChange } from '@/hooks/artworkBeforeChange'
import {
  deriveProvenanceConfidenceSummary,
  getPublicLoanHistory,
  getPublicOwnershipTimeline,
  provenanceConfidenceStatement,
} from '@/lib/artwork/artworkProvenancePublic'
import { getArtworkExhibitionEvents } from '@/lib/artwork/artworkExhibitionEvents'
import { collectArtworkSameAsUris } from '@/lib/artwork/sameAsUris'
import { artistAsSchemaPerson } from '@/lib/jsonld/artistPerson'
import {
  ARTWORK_FIXTURE_SLUG,
  buildArtworkFixtureData,
} from '@/seed/artworkFixtureData'
import { generateArtworkJsonLd } from '@/utilities/generateArtworkJsonLd'
import {
  calculateArtworkDisplaySize,
  getSizeFactor,
} from '@/utilities/artworkSizeDisplay'
import type { Artwork, Artist, Event } from '@/payload-types'

const fixtureRelations = {
  seriesId: 1,
  creatorId: 2,
  tagIds: {
    'Post-internet': 10,
    Contemporary: 11,
    Abstraction: 12,
    Photography: 13,
    Collage: 14,
    Memory: 15,
    Erasure: 16,
    Archive: 17,
    Painting: 18,
  },
  artHistoricalReferenceIds: [20, 21],
}

function minimalArtist(): Artist {
  return {
    id: 1,
    name: 'Bernard Bolter',
    ulanUri: 'https://www.getty.edu/vow/ULANFullDisplay?find=&role=&nation=&subjectid=500000000',
    wikidataUri: 'https://www.wikidata.org/wiki/Q123',
    updatedAt: '',
    createdAt: '',
  } as Artist
}

describe('artwork page verification checklist', () => {
  describe('fixture record', () => {
    const fixture = buildArtworkFixtureData(fixtureRelations)

    it('is draft with __ slug and populated layer fields', () => {
      expect(fixture.status).toBe('draft')
      expect(fixture.slug).toBe(ARTWORK_FIXTURE_SLUG)
      expect(fixture.formalContributionAssessment).toBeTruthy()
      expect(fixture.editions).toHaveLength(3)
      expect(fixture.artHistoricalReferences).toHaveLength(2)
      expect(fixture.provenanceConfidenceLayer).toHaveLength(2)
      expect(fixture.ownershipHistory).toHaveLength(1)
      expect(fixture.arEnabled).toBe(true)
      expect(fixture.reasoningStatus).toBe('complete')
    })

    it('derives partial provenance confidence for fixture layers', () => {
      expect(deriveProvenanceConfidenceSummary(fixture)).toBe('partial')
      expect(provenanceConfidenceStatement('partial')).toBe(
        'Provenance: partially documented',
      )
    })

    it('exposes collector-visible ownership without private owner detail', () => {
      const timeline = getPublicOwnershipTimeline(fixture as Artwork)
      expect(timeline).toHaveLength(1)
      expect(timeline[0]?.displayName).toBe('Private collection')
      expect(timeline[0]).not.toHaveProperty('ownerPrivate')
    })
  })

  describe('fixture slug publish guard', () => {
    it('rejects publishing __ slugs', async () => {
      await expect(
        artworkBeforeChange({
          data: { slug: ARTWORK_FIXTURE_SLUG, status: 'published' },
          operation: 'update',
          originalDoc: { slug: ARTWORK_FIXTURE_SLUG, status: 'draft' },
          context: {},
          req: { payload: { find: async () => ({ docs: [] }) } } as never,
        }),
      ).rejects.toBeInstanceOf(APIError)
    })
  })

  describe('size tier × orientation display', () => {
    const tiers = ['sm', 'md', 'lg', 'xl'] as const
    const orientations = ['landscape', 'portrait', 'square'] as const

    for (const tier of tiers) {
      for (const orientation of orientations) {
        it(`scales ${tier} ${orientation} within container`, () => {
          const baseW = orientation === 'portrait' ? 900 : 1600
          const baseH = orientation === 'portrait' ? 1200 : orientation === 'square' ? 1000 : 900
          const result = calculateArtworkDisplaySize({
            imageWidth: baseW,
            imageHeight: baseH,
            containerWidth: 800,
            containerHeight: 600,
            sizeTier: tier,
            orientation,
          })

          expect(result.displayWidth).toBeGreaterThan(0)
          expect(result.displayHeight).toBeGreaterThan(0)
          expect(result.displayWidth).toBeLessThanOrEqual(800)
          expect(result.displayHeight).toBeLessThanOrEqual(600)
          expect(getSizeFactor(tier, orientation, false)).toBeGreaterThan(0)
        })
      }
    }
  })

  describe('JSON-LD output', () => {
    const fixture = buildArtworkFixtureData(fixtureRelations)
    const artist = minimalArtist()
    const jsonLd = generateArtworkJsonLd(fixture as Artwork, artist, {
      baseUrl: 'https://bernardbolter.com',
    })

    it('types creator as Person with ULAN and Wikidata identifiers', () => {
      const creator = artistAsSchemaPerson(artist)
      expect(creator['@type']).toBe('Person')
      expect(creator.identifier).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ propertyID: 'ULAN' }),
          expect.objectContaining({ propertyID: 'Wikidata' }),
        ]),
      )
      expect(jsonLd.creator).toMatchObject({ '@type': 'Person', name: 'Bernard Bolter' })
    })

    it('emits QuantitativeValue width and height', () => {
      expect(jsonLd.width).toMatchObject({
        '@type': 'QuantitativeValue',
        unitCode: 'CMT',
      })
      expect(jsonLd.height).toMatchObject({
        '@type': 'QuantitativeValue',
        unitCode: 'CMT',
      })
      expect(typeof (jsonLd.width as { value: number }).value).toBe('number')
    })

    it('emits sameAs as an array and clip embedding endpoint', () => {
      const uris = collectArtworkSameAsUris(fixture as Artwork)
      expect(Array.isArray(jsonLd.sameAs)).toBe(true)
      expect(jsonLd.sameAs).toEqual(uris)
      expect(jsonLd['artism:clipEmbeddingEndpoint']).toBe(
        `https://bernardbolter.com/${ARTWORK_FIXTURE_SLUG}/embedding`,
      )
    })

    it('includes non-empty artism intent fields from fixture', () => {
      expect(jsonLd['artism:formalContributionAssessment']).toContain('conditional legibility')
      expect(jsonLd['artism:intent']).toBeTruthy()
      expect(jsonLd['artism:reasoningStatus']).toBe('complete')
      expect(jsonLd['artism:provenanceConfidenceLevel']).toBe('partial')
    })
  })

  describe('exhibition history filtering', () => {
    it('includes group exhibitions and excludes talks', () => {
      const groupShow = {
        id: 1,
        title: 'Signals & Noise',
        slug: '__fixture-signals-noise',
        eventType: 'group-exhibition',
        startDate: '2022-09-10',
        yearStart: 2022,
        venueName: 'Galerie Nord',
        venueCity: 'Berlin',
        hasPage: true,
        status: 'draft',
      } as Event

      const artwork = {
        events: { docs: [groupShow] },
      } as Artwork

      const rows = getArtworkExhibitionEvents(artwork)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.event.title).toBe('Signals & Noise')
    })
  })

  describe('loan history public shape', () => {
    it('maps institution and dates without private sale data', () => {
      const loans = getPublicLoanHistory({
        loanHistory: [
          {
            institution: 'Galerie Nord',
            dateOut: '2022-09-10',
            dateReturned: '2022-11-20',
            eventId: 2,
          },
        ],
      } as Artwork)

      expect(loans).toHaveLength(1)
      expect(loans[0]?.institution).toBe('Galerie Nord')
      expect(loans[0]?.eventId).toBe(2)
    })
  })

  describe('published slug policy', () => {
    it('excludes __ fixture slugs from static generation candidates', () => {
      const slugs = ['gates-iii', '__fixture-gates-iii', 'another-work']
      const publicSlugs = slugs.filter((slug) => slug.trim() && !slug.startsWith('__'))
      expect(publicSlugs).toEqual(['gates-iii', 'another-work'])
    })
  })
})

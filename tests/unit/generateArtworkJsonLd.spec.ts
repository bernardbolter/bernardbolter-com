import { describe, expect, it } from 'vitest'

import { buildHomeJsonLd } from '@/utilities/buildHomeJsonLd'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'
import { editionJsonLdHasPrivateFields } from '@/lib/jsonld/artworkExtensions'
import type { Artwork } from '@/payload-types'

function minimalArtwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: 1,
    title: 'Gates III',
    slug: 'gates-iii',
    yearCreated: 2019,
    status: 'published',
    medium: 'acrylic-on-canvas',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Artwork
}

describe('buildHomeJsonLd', () => {
  it('emits WebSite + CollectionPage with bio person reference and corpus endpoint', () => {
    const jsonLd = buildHomeJsonLd({ name: 'Bernard Bolter', bioShort: 'Cityscape archive.' } as never, {
      baseUrl: 'https://bernardbolter.com',
    })

    expect(jsonLd['@type']).toEqual(['WebSite', 'CollectionPage'])
    expect(jsonLd['@id']).toBe('https://bernardbolter.com')
    expect(jsonLd.description).toBe('Cityscape archive.')
    expect(jsonLd.author).toEqual({
      '@type': 'Person',
      '@id': 'https://bernardbolter.com/bio#person',
      name: 'Bernard Bolter',
    })
    expect(jsonLd.about).toEqual({
      '@type': 'Person',
      '@id': 'https://bernardbolter.com/bio#person',
    })
    expect(jsonLd['artism:corpusEndpoint']).toBe('https://bernardbolter.com/api/corpus')
  })
})

describe('buildArtworkJsonLd', () => {
  it('includes artism context and vision page URL when embeddings exist', () => {
    const jsonLd = buildArtworkJsonLd(
      minimalArtwork({
        clipEmbedding: [0.1, 0.2, 0.3],
      }),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd['@context']).toMatchObject({
      '@vocab': 'https://schema.org/',
      artism: 'https://artism.org/schema/',
    })
    expect(jsonLd['@id']).toBe('https://bernardbolter.com/gates-iii')
    expect(jsonLd.creator).toEqual({ '@id': 'https://bernardbolter.com/bio#person' })
    expect(jsonLd['artism:visionPageUrl']).toBe('https://bernardbolter.com/gates-iii/vision')

    const additionalProperty = (jsonLd.additionalProperty ?? []) as Array<Record<string, unknown>>
    const clipEndpoint = additionalProperty.find(
      (row) => row.propertyID === 'artism:clipEmbeddingEndpoint',
    )
    expect(clipEndpoint).toBeUndefined()
  })

  it('suppresses reasoningStatus stub in additionalProperty', () => {
    const jsonLd = buildArtworkJsonLd(
      minimalArtwork({ reasoningStatus: 'stub' }),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    const additionalProperty = (jsonLd.additionalProperty ?? []) as Array<Record<string, unknown>>
    const reasoning = additionalProperty.find(
      (row) => row.propertyID === 'artism:reasoningStatus',
    )
    expect(reasoning).toBeUndefined()
  })

  it('emits corpus vision fields when analyses and embeddings metadata exist', () => {
    const jsonLd = buildArtworkJsonLd(
      minimalArtwork({
        embeddings: [
          {
            model: 'clip-vit-large-patch14',
            dimensions: 768,
            pgVectorColumn: 'clip_embedding',
            specUrl: 'https://huggingface.co/openai/clip-vit-large-patch14',
            shortDescription: 'Language-informed visual embedding — 768 dimensions',
            generatedDate: '2026-03-15T00:00:00.000Z',
          },
        ],
        visionAnalyses: [
          {
            text: 'Strong diagonal from lower-left.',
            model: 'claude-sonnet-4-6',
            date: '2026-07-08T00:00:00.000Z',
          },
        ],
      }),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    const embeddings = jsonLd['artism:embeddings'] as Array<Record<string, unknown>>
    expect(embeddings).toHaveLength(1)
    expect(embeddings[0]).not.toHaveProperty('artism:vector')

    const analyses = jsonLd['artism:visionAnalyses'] as Array<Record<string, unknown>>
    expect(analyses).toHaveLength(1)
    expect(analyses[0]?.text).toBe('Strong diagonal from lower-left.')
  })

  it('emits catalogue number in additionalProperty', () => {
    const jsonLd = buildArtworkJsonLd(
      minimalArtwork({ catalogueNumber: 'BB-ACH-2019-003' }),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    const additionalProperty = (jsonLd.additionalProperty ?? []) as Array<Record<string, unknown>>
    expect(additionalProperty).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          propertyID: 'artism:catalogueNumber',
          value: 'BB-ACH-2019-003',
        }),
      ]),
    )
  })

  it('emits DefinedTerm artMedium when mediumAatUri is set', () => {
    const jsonLd = buildArtworkJsonLd(
      minimalArtwork({
        mediumAatUri: 'http://vocab.getty.edu/aat/300014666',
      }),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd.artMedium).toMatchObject({
      '@type': 'DefinedTerm',
      inDefinedTermSet: 'http://vocab.getty.edu/aat/',
      sameAs: 'http://vocab.getty.edu/aat/300014666',
    })
  })

  it('never emits private commerce fields in JSON-LD', () => {
    const jsonLd = buildArtworkJsonLd(
      minimalArtwork({
        askingPrice: 12000,
        ownershipHistory: [{ ownerPrivate: 'secret' }],
        loanHistory: [{ institution: 'Museum' }],
        provenanceConfidenceLayer: [{ confidenceLevel: 'documented-fact' }],
        salesRecord: [{ netToArtist: 5000 }],
        clipEmbedding: [0.1],
      } as Partial<Artwork>),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd).not.toHaveProperty('askingPrice')
    expect(jsonLd).not.toHaveProperty('ownershipHistory')
    expect(jsonLd).not.toHaveProperty('loanHistory')
    expect(jsonLd).not.toHaveProperty('salesRecord')
    expect(jsonLd).not.toHaveProperty('provenanceConfidenceLayer')
    expect(jsonLd).not.toHaveProperty('clipEmbedding')
  })

  it('emits subjectOf references for hasPage events only', () => {
    const jsonLd = buildArtworkJsonLd(
      minimalArtwork({
        events: {
          docs: [
            {
              id: 1,
              title: 'Megacities',
              slug: 'megacities-2020',
              hasPage: true,
              eventType: 'solo-exhibition',
              status: 'published',
              startDate: '2020-01-01',
              updatedAt: '',
              createdAt: '',
            },
            {
              id: 2,
              title: 'Talk',
              slug: 'artist-talk',
              hasPage: false,
              eventType: 'talk-panel',
              status: 'published',
              startDate: '2021-01-01',
              updatedAt: '',
              createdAt: '',
            },
          ],
        },
      } as Partial<Artwork>),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd.subjectOf).toEqual([
      { '@id': 'https://bernardbolter.com/events/megacities-2020' },
    ])
  })

  it('emits edition, provenance, and related-work artism fields for limited editions', () => {
    const jsonLd = buildArtworkJsonLd(
      minimalArtwork({
        hasEditions: 'limited',
        provenanceOriginKnown: true,
        provenanceConfidenceLayer: [
          {
            claim: 'Work created during a school trip to Basel, 2007',
            evidenceBasis: 'Private artist note',
            confidenceLevel: 'documented-fact',
          },
          {
            claim: 'Collector print exhibited in Amsterdam',
            evidenceBasis: 'Gallery correspondence',
            confidenceLevel: 'documented-fact',
          },
          {
            claim: 'Museum label attribution',
            evidenceBasis: 'Loan file',
            confidenceLevel: 'institutional-assertion',
          },
          {
            claim: 'Possibly shown in Zurich',
            evidenceBasis: 'Uncorroborated',
            confidenceLevel: 'speculation',
          },
        ],
        relatedWorks: [
          {
            relationshipType: 'derivative-oil-painting',
            relatedWorkNote:
              'A related oil painting interpretation exists — a Da Fen collaboration work, catalogued independently of this digital edition.',
          },
        ],
        dcs: {
          editionTiers: [
            {
              tierName: 'monumental',
              seriesTierKey: 'monumental',
              totalEditionSize: 3,
              printSubstrate: 'aluminum-mount',
              isOriginalTier: true,
              copies: [
                {
                  copyNumber: '1/3',
                  isArtistProof: false,
                  claimStatus: 'claimed-confirmed',
                },
              ],
            },
            {
              tierName: 'collectors-print',
              seriesTierKey: 'collectors-print',
              totalEditionSize: 9,
              printSubstrate: 'aluminum-mount',
              copies: [],
            },
            {
              tierName: 'small-print',
              seriesTierKey: 'small-print',
              totalEditionSize: 200,
              printSubstrate: 'paper',
              copies: [],
            },
          ],
        },
        series: {
          id: 1,
          name: 'Digital City Series',
          slug: 'digital-city-series',
          editionTiers: [
            {
              tierKey: 'monumental',
              tierName: 'Monumental',
              tierOrder: 1,
              isOriginalTier: true,
              editionSize: 3,
              apCount: 1,
              dimensionUnit: 'cm',
              widthWhole: 121,
              heightWhole: 121,
              substrate: 'aluminum-mount',
              printTechnique: 'digital-c-print',
            },
            {
              tierKey: 'collectors-print',
              tierName: 'Collectors print',
              tierOrder: 2,
              editionSize: 9,
              apCount: 2,
              dimensionUnit: 'cm',
              widthWhole: 60,
              heightWhole: 60,
              substrate: 'aluminum-mount',
              printTechnique: 'digital-c-print',
            },
            {
              tierKey: 'small-print',
              tierName: 'Small print',
              tierOrder: 3,
              editionSize: 200,
              apCount: 0,
              dimensionUnit: 'cm',
              widthWhole: 33,
              heightWhole: 33,
              substrate: 'paper',
              printTechnique: 'pigment-print',
            },
          ],
          updatedAt: '',
          createdAt: '',
        },
      } as Partial<Artwork>),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    const editionTierSpec = jsonLd['artism:editionTierSpec'] as Array<Record<string, unknown>>
    expect(editionTierSpec).toHaveLength(3)
    expect(editionTierSpec[0]).toMatchObject({
      tierName: 'Monumental',
      isOriginalTier: true,
      editionSize: 3,
      apCount: 1,
      widthCm: 121,
      heightCm: 121,
      substrate: 'Aluminum mount',
      printTechnique: 'Digital C-print',
    })
    expect(editionJsonLdHasPrivateFields(editionTierSpec)).toBe(false)

    expect(jsonLd['artism:editionClaimSummary']).toEqual([
      'Monumental: 1 of 3 claimed',
      'Collectors print: 0 of 9 claimed',
      'Small print: 0 of 200 claimed',
    ])
    expect(jsonLd['artism:originalEditionSize']).toBe(3)
    expect(jsonLd['artism:originalEditionApCount']).toBe(1)
    expect(jsonLd['artism:provenanceConfidenceLevel']).toBe('fully-documented')

    const provenanceClaims = jsonLd['artism:provenanceClaims'] as Array<Record<string, unknown>>
    expect(provenanceClaims).toHaveLength(2)
    expect(provenanceClaims.every((row) => row.confidenceLevel !== 'institutional-assertion')).toBe(
      true,
    )
    expect(JSON.stringify(provenanceClaims)).not.toContain('evidenceBasis')

    expect(jsonLd['artism:relatedWork']).toEqual([
      {
        relationshipType: 'derivative-oil-painting',
        description:
          'A related oil painting interpretation exists — a Da Fen collaboration work, catalogued independently of this digital edition.',
      },
    ])
  })

  it('emits untrackedEditionsNote for open editions instead of tier specs', () => {
    const jsonLd = buildArtworkJsonLd(
      minimalArtwork({
        hasEditions: 'open',
        untrackedEditionsNote: 'Informal A3 prints sold at graduation show.',
      }),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd['artism:untrackedEditionsNote']).toBe(
      'Informal A3 prints sold at graduation show.',
    )
    expect(jsonLd).not.toHaveProperty('artism:editionTierSpec')
    expect(jsonLd).not.toHaveProperty('artism:editionClaimSummary')
  })

  it('omits edition JSON-LD when hasEditions is none', () => {
    const jsonLd = buildArtworkJsonLd(
      minimalArtwork({
        hasEditions: 'none',
        ownershipRegistry: [
          {
            tierLabel: 'Should not leak',
            editionSize: 10,
            copies: [],
          },
        ],
      } as Partial<Artwork>),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd).not.toHaveProperty('artism:editionTierSpec')
    expect(jsonLd).not.toHaveProperty('artism:editionClaimSummary')
  })
})

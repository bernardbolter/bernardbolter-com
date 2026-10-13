import { describe, expect, it } from 'vitest'

import { buildArtOfficialContract } from '@/lib/artOfficial/contract/buildContractArtifact'
import { buildCorpusBriefing } from '@/lib/corpus/artifact/buildBriefing'
import type { CorpusArtifact, CorpusWorkEnvelope } from '@/lib/corpus/artifact/types'
import { BRIEFING_FETCH_CHAR_BUDGET } from '@/lib/corpus/constants'

function work(
  overrides: Partial<CorpusWorkEnvelope> & {
    slug: string
    status?: string
    intent?: string
  },
): CorpusWorkEnvelope {
  const status = overrides.status ?? 'stub'
  return {
    slug: overrides.slug,
    catalogueSequence: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    sessionCount: status === 'stub' ? 0 : 1,
    filters: {
      seriesSlug: 'megacities',
      seriesName: 'Megacities',
      yearCreated: 2007,
      reasoningStatus: status,
      hasVisionAnalyses: false,
      title: overrides.slug,
    },
    indexProjection: {
      'art-official:gist': status === 'stub' ? null : 'A gist line.',
      'art-official:gistSource': status === 'stub' ? null : 'intent',
    },
    surveyProjection: {
      'art-official:intentLine': overrides.intent ?? (status === 'stub' ? null : 'An intent.'),
      description: status === 'stub' ? null : 'Short description.',
    },
    record: {
      name: overrides.slug,
      isPartOf: { name: 'Megacities' },
      additionalProperty: overrides.intent
        ? [{ propertyID: 'art-official:intent', value: overrides.intent }]
        : [],
    },
    automaticFields: null,
    ...overrides,
  }
}

function artifact(works: CorpusWorkEnvelope[]): CorpusArtifact {
  const complete = works.filter((w) => w.filters.reasoningStatus === 'complete').length
  return {
    '@context': ['https://schema.org', 'https://art-official.org/ns/'],
    '@type': 'DataFeed',
    name: 'test',
    url: 'https://bernardbolter.com/api/corpus/all',
    dateModified: '2026-10-13T00:00:00.000Z',
    'art-official:corpusVersion': '1.0',
    'art-official:generatedAt': '2026-10-13T14:00:00.000Z',
    'art-official:supersedesNote': 'supersedes',
    'art-official:totalArtworks': works.length,
    'art-official:totalPublished': works.length,
    'art-official:coverage': {
      matched: works.length,
      withArtistIntent: complete,
      withVisionAnalysis: 0,
      withSessions: complete,
      reasoningComplete: complete,
    },
    author: { '@type': 'Person', name: 'Bernard Bolter' },
    about: [],
    throughlines: [
      {
        slug: 'inside-outside-position',
        text: 'A long claim that must not bloat the briefing paste. '.repeat(20),
        memberSlugs: ['venice-biennale-2007'],
      },
    ],
    bioEntries: [],
    sessionLedger: [
      {
        sessionId: 's1',
        sessionType: 'artwork-cataloguing',
        status: 'completed',
        primarySlug: 'a',
        mentionedSlugs: [],
        fieldsCovered: ['intent'],
      },
    ],
    works,
  }
}

describe('buildCorpusBriefing', () => {
  it('puts identity counts first and keeps stubs minimal', () => {
    const a = artifact([
      work({ slug: 'complete-work', status: 'complete', intent: 'Why this exists.' }),
      ...Array.from({ length: 50 }, (_, i) => work({ slug: `stub-${i}`, status: 'stub' })),
    ])
    const briefing = buildCorpusBriefing(a, {
      contract: buildArtOfficialContract('2026-10-13T14:00:00.000Z'),
    })
    const keys = Object.keys(briefing)
    expect(keys.slice(0, 3)).toEqual([
      'art-official:totalWorks',
      'art-official:coverage',
      'art-official:generatedAt',
    ])
    expect(briefing['art-official:totalWorks']).toBe(51)
    expect(briefing['art-official:coverage'].complete).toBe(1)
    expect(briefing['art-official:coverage'].stub).toBe(50)

    const stub = briefing.works.find((w) => w.slug === 'stub-0')
    expect(stub).toEqual({
      slug: 'stub-0',
      title: 'stub-0',
      series: 'Megacities',
      reasoningStatus: 'stub',
    })
    const complete = briefing.works.find((w) => w.slug === 'complete-work')
    expect(complete?.intent).toBe('Why this exists.')

    expect(briefing.sessionLedger).toMatchObject({
      count: 1,
      indexUrl: 'https://bernardbolter.com/sessions',
    })
    expect(briefing.throughlines[0]).toMatchObject({
      slug: 'inside-outside-position',
      claimUrl: 'https://bernardbolter.com/statement/throughlines/inside-outside-position',
    })
    expect(briefing.throughlines[0]).not.toHaveProperty('text')
  })

  it('stays under the fetch-tool char budget for a 220-work-shaped corpus', () => {
    const works = [
      ...Array.from({ length: 34 }, (_, i) =>
        work({
          slug: `complete-${i}`,
          status: 'complete',
          intent: `Intent prose for work ${i}. `.repeat(8),
        }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        work({ slug: `partial-${i}`, status: 'partial', intent: `Partial ${i}` }),
      ),
      ...Array.from({ length: 182 }, (_, i) => work({ slug: `stub-${i}`, status: 'stub' })),
    ]
    const briefing = buildCorpusBriefing(artifact(works), {
      contract: buildArtOfficialContract('2026-10-13T14:00:00.000Z'),
    })
    const chars = JSON.stringify(briefing).length
    expect(chars).toBeLessThanOrEqual(BRIEFING_FETCH_CHAR_BUDGET)
    expect(briefing.works).toHaveLength(220)
  })
})

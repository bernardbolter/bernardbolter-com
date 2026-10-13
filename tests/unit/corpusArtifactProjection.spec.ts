import { describe, expect, it } from 'vitest'

import {
  buildIndexResponseFromArtifact,
  filterArtifactWorks,
  findArtifactWork,
} from '@/lib/corpus/artifact/projectFromArtifact'
import type { CorpusArtifact, CorpusWorkEnvelope } from '@/lib/corpus/artifact/types'

function work(overrides: Partial<CorpusWorkEnvelope> & { slug: string }): CorpusWorkEnvelope {
  return {
    slug: overrides.slug,
    catalogueSequence: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    sessionCount: 0,
    filters: {
      seriesSlug: 'megacities',
      seriesName: 'Megacities',
      yearCreated: 2007,
      reasoningStatus: 'stub',
      hasVisionAnalyses: false,
      title: 'Test',
      ...overrides.filters,
    },
    indexProjection: {
      '@type': 'VisualArtwork',
      'art-official:slug': overrides.slug,
      'art-official:gist': 'A gist.',
      'art-official:reasoningStatus': 'stub',
      ...overrides.indexProjection,
    },
    surveyProjection: {
      '@type': 'VisualArtwork',
      'art-official:slug': overrides.slug,
      'art-official:gist': 'A gist.',
      'art-official:intentLine': 'An intent.',
      description: 'Short description',
      ...overrides.surveyProjection,
    },
    record: {
      '@context': ['https://schema.org', 'https://art-official.org/ns/'],
      '@type': 'VisualArtwork',
      name: 'Test',
      'art-official:slug': overrides.slug,
      ...overrides.record,
    },
    automaticFields: null,
    ...overrides,
  }
}

function artifact(works: CorpusWorkEnvelope[]): CorpusArtifact {
  return {
    '@context': ['https://schema.org', 'https://art-official.org/ns/'],
    '@type': 'DataFeed',
    name: 'test',
    url: 'https://bernardbolter.com/api/corpus/all',
    dateModified: '2026-10-11T00:00:00.000Z',
    'art-official:corpusVersion': '1.0',
    'art-official:generatedAt': '2026-10-11T00:00:00.000Z',
    'art-official:supersedesNote': 'supersedes',
    'art-official:totalArtworks': works.length,
    'art-official:totalPublished': works.length,
    'art-official:coverage': {
      matched: works.length,
      withArtistIntent: 0,
      withVisionAnalysis: 0,
      withSessions: 0,
      reasoningComplete: 0,
    },
    author: { '@type': 'Person', name: 'Bernard Bolter' },
    about: [],
    throughlines: [],
    bioEntries: [],
    sessionLedger: [],
    works,
  }
}

describe('corpus artifact projection', () => {
  it('filters and paginates index without recomputing gist', () => {
    const a = artifact([
      work({ slug: 'a', filters: { seriesSlug: 'megacities', seriesName: 'Megacities', yearCreated: 2007, reasoningStatus: 'complete', hasVisionAnalyses: true, title: 'A' } }),
      work({ slug: 'b', filters: { seriesSlug: 'other', seriesName: 'Other', yearCreated: 2010, reasoningStatus: 'stub', hasVisionAnalyses: false, title: 'B' } }),
    ])

    const matched = filterArtifactWorks(a.works, { series: 'megacities' })
    expect(matched.map((w) => w.slug)).toEqual(['a'])

    const index = buildIndexResponseFromArtifact({
      artifact: a,
      filters: { series: 'megacities' },
      depth: 'index',
    })
    const elements = index.dataFeedElement as Array<Record<string, unknown>>
    expect(elements).toHaveLength(1)
    expect(elements[0]?.['art-official:gist']).toBe('A gist.')
    expect(elements[0]).not.toHaveProperty('art-official:intentLine')

    const survey = buildIndexResponseFromArtifact({
      artifact: a,
      filters: { series: 'megacities' },
      depth: 'survey',
    })
    const surveyEls = survey.dataFeedElement as Array<Record<string, unknown>>
    expect(surveyEls[0]?.['art-official:intentLine']).toBe('An intent.')
    expect(surveyEls[0]?.description).toBe('Short description')
  })

  it('finds a work slice by slug', () => {
    const a = artifact([work({ slug: 'the-thinker' })])
    expect(findArtifactWork(a, 'the-thinker')?.slug).toBe('the-thinker')
    expect(findArtifactWork(a, 'missing')).toBeNull()
  })
})

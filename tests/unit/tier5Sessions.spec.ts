import { describe, expect, it } from 'vitest'

import {
  buildSessionJsonLd,
  buildTier5EventSessionsResponse,
  buildTier5SessionByIdResponse,
  buildTier5SessionsResponse,
  projectTier5Session,
  sessionMatchesArtworkSlug,
  sessionMatchesEventSlug,
  type Tier5SessionSource,
} from '@/lib/corpus/buildTier5SessionsResponse'
import {
  parseSessionIndexFilters,
  buildSessionIndexQueryString,
} from '@/lib/corpus/sessionIndexFilters'
import type { Artwork } from '@/payload-types'

const venice = {
  id: 1,
  slug: 'venice-biennale-2007',
  title: 'Venice Biennale 2007',
} as Artwork

const munster = {
  id: 2,
  slug: 'skulptur-projekte-m-nster-2007',
  title: 'Skulptur Projekte Münster 2007',
} as Artwork

function session(overrides: Partial<Tier5SessionSource> = {}): Tier5SessionSource {
  return {
    sessionId: 'venice-session-1',
    sessionType: 'artwork-cataloguing',
    status: 'completed',
    createdAt: '2026-07-23T10:00:00.000Z',
    completedAt: '2026-07-23T12:00:00.000Z',
    primaryArtwork: venice,
    artworkRecord: venice,
    mentionedArtworks: [munster],
    messages: [
      { role: 'user', content: 'first look' },
      { role: 'assistant', content: 'what do you see?' },
    ],
    firstImpression: 'paired city works',
    secondDescription: 'hinge across venues',
    fieldUpdateTimeline: [
      {
        field: 'title',
        value: 'Venice Biennale 2007',
        confidence: 'high',
        source: 'artist',
        timestamp: '2026-07-23T11:00:00.000Z',
      },
    ],
    sessionNotes: 'agent paced toward closure prematurely',
    weakPhases: ['confirmation'],
    blindDescriptionUseful: true,
    formalContributionAccuracy: 'partial',
    dialogueRefinementFlag: true,
    refinementNotes: 'slow the wrap-up',
    agentDraftDescriptionShort: 'draft short',
    agentDraftDescriptionLong: 'draft long',
    agentDraftConceptualKeywords: [{ keyword: 'pair' }, { keyword: 'hinge' }],
    agentDraftFormalContributionAssessment: 'draft formal',
    agentModel: 'claude-sonnet-4-6',
    ...overrides,
  }
}

describe('sessionMatchesEventSlug', () => {
  it('matches event-enrichment sessions by eventRecord slug', () => {
    const s = session({
      sessionType: 'event-enrichment',
      primaryArtwork: null,
      artworkRecord: null,
      mentionedArtworks: [],
      eventRecord: {
        id: 40,
        slug: 'pecha-kucha-amsterdam-vol-9-mediamatic-2009',
        title: 'Pecha Kucha Night Amsterdam Vol. 9',
      } as never,
    })
    expect(sessionMatchesEventSlug(s, 'pecha-kucha-amsterdam-vol-9-mediamatic-2009')).toBe(true)
    expect(sessionMatchesEventSlug(s, 'artspan-selections-2017-heron-arts')).toBe(false)
  })
})

describe('buildTier5EventSessionsResponse', () => {
  it('returns event-scoped feed with DialogueSelfAudit namespaced', () => {
    const s = session({
      sessionId: 'mediamatic-session-1',
      sessionType: 'event-enrichment',
      primaryArtwork: null,
      artworkRecord: null,
      mentionedArtworks: [],
      eventRecord: {
        id: 40,
        slug: 'pecha-kucha-amsterdam-vol-9-mediamatic-2009',
        title: 'Pecha Kucha',
      } as never,
    })
    const body = buildTier5EventSessionsResponse({
      eventSlug: 'pecha-kucha-amsterdam-vol-9-mediamatic-2009',
      sessions: [s],
      baseUrl: 'https://example.com',
    })
    expect(body['artism:eventSlug']).toBe('pecha-kucha-amsterdam-vol-9-mediamatic-2009')
    expect(body.sessions).toHaveLength(1)
    expect(body.sessions[0].eventRecord).toBe('pecha-kucha-amsterdam-vol-9-mediamatic-2009')
    expect(body.sessions[0]['artism:DialogueSelfAudit']).toBeDefined()
    expect(body.sessions[0].artistRecord).toBeDefined()
  })
})

describe('sessionMatchesArtworkSlug', () => {
  it('matches primary and mentioned artworks (bidirectional)', () => {
    const s = session()
    expect(sessionMatchesArtworkSlug(s, 'venice-biennale-2007')).toBe(true)
    expect(sessionMatchesArtworkSlug(s, 'skulptur-projekte-m-nster-2007')).toBe(true)
    expect(sessionMatchesArtworkSlug(s, 'unrelated-work')).toBe(false)
  })

  it('matches mentioned artwork when primary artwork is absent', () => {
    const s = session({
      primaryArtwork: null,
      artworkRecord: null,
      mentionedArtworks: [munster],
    })
    expect(sessionMatchesArtworkSlug(s, 'skulptur-projekte-m-nster-2007')).toBe(true)
    expect(sessionMatchesArtworkSlug(s, 'venice-biennale-2007')).toBe(false)
  })
})

describe('projectTier5Session', () => {
  it('keeps artistRecord and artism:DialogueSelfAudit as separate nodes', () => {
    const projected = projectTier5Session(session())
    expect(projected).not.toBeNull()
    expect(projected!.artistRecord).toEqual({
      firstImpression: 'paired city works',
      secondDescription: 'hinge across venues',
      messages: [
        { role: 'user', content: 'first look' },
        { role: 'assistant', content: 'what do you see?' },
      ],
      fieldUpdateTimeline: [
        {
          field: 'title',
          value: 'Venice Biennale 2007',
          confidence: 'high',
          source: 'artist',
          timestamp: '2026-07-23T11:00:00.000Z',
        },
      ],
    })
    expect(projected!['artism:DialogueSelfAudit']).toEqual({
      agentModel: 'claude-sonnet-4-6',
      sessionNotes: 'agent paced toward closure prematurely',
      weakPhases: ['confirmation'],
      blindDescriptionUseful: true,
      formalContributionAccuracy: 'partial',
      dialogueRefinementFlag: true,
      refinementNotes: 'slow the wrap-up',
      agentDraftDescriptionShort: 'draft short',
      agentDraftDescriptionLong: 'draft long',
      agentDraftConceptualKeywords: ['pair', 'hinge'],
      agentDraftFormalContribution: 'draft formal',
    })
    expect(projected).not.toHaveProperty('sessionNotes')
    expect(Object.keys(projected!.artistRecord)).not.toContain('agentModel')
  })

  it('never projects in-progress sessions', () => {
    expect(projectTier5Session(session({ status: 'in-progress' }))).toBeNull()
  })

  it('always includes agentModel on DialogueSelfAudit even when unset', () => {
    const projected = projectTier5Session(session({ agentModel: null }))
    expect(projected!['artism:DialogueSelfAudit']).toHaveProperty('agentModel', null)
  })
})

describe('buildTier5SessionsResponse', () => {
  it('returns Venice session for both Venice and Münster queries', () => {
    const sessions = [session(), session({ sessionId: 'draft', status: 'in-progress' })]

    const veniceResponse = buildTier5SessionsResponse({
      artworkSlug: 'venice-biennale-2007',
      sessions,
      baseUrl: 'https://bernardbolter.com',
    })
    expect(veniceResponse['artism:tier']).toBe(5)
    expect(veniceResponse['artism:scope']).toBe('work')
    expect(veniceResponse['artism:depth']).toBe('sessions')
    expect(veniceResponse['artism:artworkSlug']).toBe('venice-biennale-2007')
    expect(veniceResponse['artism:artworkUrl']).toBe(
      'https://bernardbolter.com/venice-biennale-2007',
    )
    expect(veniceResponse['artism:recordUrl']).toBe(
      'https://bernardbolter.com/api/corpus/venice-biennale-2007',
    )
    expect(veniceResponse['artism:coverage']).toEqual({ sessionCount: 1 })
    expect(veniceResponse['artism:tierMap']).toHaveProperty('5')
    expect(veniceResponse['artism:tierMap']).not.toHaveProperty('3')
    expect(veniceResponse.sessions[0]?.mentionedArtworks).toEqual([
      'skulptur-projekte-m-nster-2007',
    ])
    expect(veniceResponse).not.toHaveProperty('artworkSlug')
    expect(veniceResponse).not.toHaveProperty('artism:totalSessions')

    const munsterResponse = buildTier5SessionsResponse({
      artworkSlug: 'skulptur-projekte-m-nster-2007',
      sessions,
      baseUrl: 'https://bernardbolter.com',
    })
    expect(munsterResponse['artism:coverage']).toEqual({ sessionCount: 1 })
    expect(munsterResponse.sessions[0]?.sessionId).toBe('venice-session-1')
    expect(munsterResponse.sessions[0]?.primaryArtwork).toBe('venice-biennale-2007')
  })
})

describe('buildSessionJsonLd', () => {
  it('embeds Tier 5 streams with absolute artwork URLs and sameAs', () => {
    const jsonLd = buildSessionJsonLd(session(), 'https://bernardbolter.com')
    expect(jsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'artism:Session',
      '@id': 'https://bernardbolter.com/sessions/venice-session-1',
      primaryArtwork: 'https://bernardbolter.com/venice-biennale-2007',
      mentionedArtworks: [
        'https://bernardbolter.com/skulptur-projekte-m-nster-2007',
      ],
      sameAs:
        'https://bernardbolter.com/api/corpus/sessions/venice-session-1?tier=5',
    })
    expect(jsonLd).toHaveProperty('artistRecord')
    expect(jsonLd).toHaveProperty('artism:DialogueSelfAudit')
    expect((jsonLd!.artistRecord as { messages: unknown[] }).messages).toHaveLength(2)
  })
})

describe('buildTier5SessionByIdResponse', () => {
  it('exposes sessions without primaryArtwork', () => {
    const body = buildTier5SessionByIdResponse({
      session: session({
        sessionId: 'statement-session-1',
        sessionType: 'artist-statement',
        primaryArtwork: null,
        artworkRecord: null,
        mentionedArtworks: [],
      }),
      baseUrl: 'https://bernardbolter.com',
    })
    expect(body).toMatchObject({
      '@type': 'artism:Session',
      'artism:tier': 5,
      sessionId: 'statement-session-1',
      primaryArtwork: null,
      url: 'https://bernardbolter.com/api/corpus/sessions/statement-session-1?tier=5',
    })
    expect(body).toHaveProperty('artistRecord')
    expect(body).toHaveProperty('artism:DialogueSelfAudit')
  })
})

describe('parseSessionIndexFilters', () => {
  it('parses crawlable query params including linchpinFlag', () => {
    const filters = parseSessionIndexFilters(
      new URLSearchParams(
        'sessionType=artwork-cataloguing&series=breaking-down-art&linchpinFlag=true&completedAfter=2026',
      ),
    )
    expect(filters).toEqual({
      artwork: null,
      sessionType: 'artwork-cataloguing',
      series: 'breaking-down-art',
      completedAfter: '2026-01-01',
      completedBefore: null,
      linchpinFlag: true,
      hasStruggle: null,
    })
    expect(buildSessionIndexQueryString(filters)).toBe(
      '?sessionType=artwork-cataloguing&series=breaking-down-art&completedAfter=2026&linchpinFlag=true',
    )
  })
})

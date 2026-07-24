import { describe, expect, it } from 'vitest'

import {
  buildTier5SessionsResponse,
  projectTier5Session,
  sessionMatchesArtworkSlug,
  type Tier5SessionSource,
} from '@/lib/corpus/buildTier5SessionsResponse'
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

describe('sessionMatchesArtworkSlug', () => {
  it('matches primary and mentioned artworks (bidirectional)', () => {
    const s = session()
    expect(sessionMatchesArtworkSlug(s, 'venice-biennale-2007')).toBe(true)
    expect(sessionMatchesArtworkSlug(s, 'skulptur-projekte-m-nster-2007')).toBe(true)
    expect(sessionMatchesArtworkSlug(s, 'unrelated-work')).toBe(false)
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
    expect(veniceResponse['artism:totalSessions']).toBe(1)
    expect(veniceResponse.sessions[0]?.mentionedArtworks).toEqual([
      'skulptur-projekte-m-nster-2007',
    ])

    const munsterResponse = buildTier5SessionsResponse({
      artworkSlug: 'skulptur-projekte-m-nster-2007',
      sessions,
      baseUrl: 'https://bernardbolter.com',
    })
    expect(munsterResponse['artism:totalSessions']).toBe(1)
    expect(munsterResponse.sessions[0]?.sessionId).toBe('venice-session-1')
    expect(munsterResponse.sessions[0]?.primaryArtwork).toBe('venice-biennale-2007')
  })
})

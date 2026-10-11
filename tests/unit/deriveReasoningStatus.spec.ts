import { describe, expect, it } from 'vitest'

import {
  artworkHasWhy,
  deriveReasoningStatus,
  indexSessionEvidence,
  primarySessionsForArtwork,
  sessionMessageCount,
  type SessionEvidence,
} from '@/lib/artwork/deriveReasoningStatus'

function session(overrides: Partial<SessionEvidence> & { sessionId: string }): SessionEvidence {
  return {
    primaryArtworkId: 1,
    primarySlug: 'test-work',
    messageCount: 0,
    timelineCount: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('deriveReasoningStatus', () => {
  it('counts messages only when the value is an array', () => {
    expect(sessionMessageCount([{ role: 'user', content: 'hi' }])).toBe(1)
    expect(sessionMessageCount(null)).toBe(0)
    expect(sessionMessageCount(undefined)).toBe(0)
  })

  it('detects why from any of the four fields', () => {
    expect(artworkHasWhy({ intent: '  why  ' })).toBe(true)
    expect(artworkHasWhy({ formalContributionAssessment: 'x' })).toBe(true)
    expect(artworkHasWhy({ descriptionShort: 'x' })).toBe(true)
    expect(artworkHasWhy({ workContext: 'x' })).toBe(true)
    expect(artworkHasWhy({})).toBe(false)
    expect(artworkHasWhy({ intent: '   ' })).toBe(false)
  })

  it('marks complete only with messages and why', () => {
    const derived = deriveReasoningStatus(
      { intent: 'because' },
      [session({ sessionId: 's1', messageCount: 3, timelineCount: 2 })],
    )
    expect(derived.status).toBe('complete')
    expect(derived.partialKind).toBeNull()
    expect(derived.evidenceKind).toBe('live-timeline')
  })

  it('treats empty-timeline sessions with messages as envelope evidence', () => {
    const derived = deriveReasoningStatus(
      { descriptionShort: 'short' },
      [session({ sessionId: 's1', messageCount: 5, timelineCount: 0 })],
    )
    expect(derived.status).toBe('complete')
    expect(derived.evidenceKind).toBe('envelope-transcript')
  })

  it('splits partial into session-but-no-why vs why-but-no-session', () => {
    const sessionOnly = deriveReasoningStatus({}, [
      session({ sessionId: 's1', messageCount: 2 }),
    ])
    expect(sessionOnly.status).toBe('partial')
    expect(sessionOnly.partialKind).toBe('session-but-no-why')

    const whyOnly = deriveReasoningStatus({ intent: 'from elsewhere' }, [])
    expect(whyOnly.status).toBe('partial')
    expect(whyOnly.partialKind).toBe('why-but-no-session')
    expect(whyOnly.evidenceKind).toBe('no-primary-session')
  })

  it('treats zero-message completed sessions as ghost shells, not cataloguing', () => {
    const derived = deriveReasoningStatus({}, [
      session({ sessionId: 'ghost', messageCount: 0, timelineCount: 0 }),
    ])
    expect(derived.status).toBe('stub')
    expect(derived.hasCompletedSessionWithMessages).toBe(false)
    expect(derived.evidenceKind).toBe('ghost-shell')
  })

  it('indexes primary sessions by id and slug without duplicates', () => {
    const index = indexSessionEvidence([
      session({ sessionId: 'a', primaryArtworkId: 7, primarySlug: 'seven' }),
      session({ sessionId: 'a', primaryArtworkId: null, primarySlug: 'seven' }),
      session({ sessionId: 'b', primaryArtworkId: null, primarySlug: 'seven' }),
    ])
    const primary = primarySessionsForArtwork({ id: 7, slug: 'seven' }, index)
    expect(primary.map((s) => s.sessionId).sort()).toEqual(['a', 'b'])
  })
})

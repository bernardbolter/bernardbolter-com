import { describe, expect, it } from 'vitest'

import { resolveToolsForSession } from '@/lib/artOfficial/agentTools'
import {
  buildEventDraftPatchFromSession,
  buildEventFieldConfidenceMap,
  buildEventPatchFromTimeline,
} from '@/lib/artOfficial/buildEventPatch'
import { normalizeEventDialoguePhase } from '@/lib/artOfficial/eventDialoguePhase'
import { resolveModel } from '@/lib/artOfficial/sessionPhase'

describe('event dialogue phase helpers', () => {
  it('normalizes unknown phases to phase-a-research', () => {
    expect(normalizeEventDialoguePhase(undefined)).toBe('phase-a-research')
    expect(normalizeEventDialoguePhase('phase-b-reasoning')).toBe('phase-b-reasoning')
  })

  it('resolves Haiku for phase A and Sonnet for phase B', () => {
    expect(resolveModel('intent', 'event-enrichment', 'phase-a-research')).toContain('haiku')
    expect(resolveModel('intent', 'event-enrichment', 'phase-b-reasoning')).not.toContain('haiku')
  })
})

describe('resolveToolsForSession', () => {
  it('exposes authority tools in phase A only', () => {
    const phaseA = resolveToolsForSession('event-enrichment', 'phase-a-research').map((t) => t.name)
    const phaseB = resolveToolsForSession('event-enrichment', 'phase-b-reasoning').map((t) => t.name)

    expect(phaseA).toContain('propose_authority_field')
    expect(phaseA).toContain('transition_to_reasoning_phase')
    expect(phaseA).not.toContain('update_field')

    expect(phaseB).toContain('update_field')
    expect(phaseB).not.toContain('propose_authority_field')
  })

  it('returns full toolset for artwork sessions', () => {
    const tools = resolveToolsForSession('artwork-cataloguing', 'phase-a-research')
    expect(tools.some((t) => t.name === 'update_field')).toBe(true)
  })
})

describe('buildEventPatch helpers', () => {
  it('builds confidence map from timeline entries', () => {
    const map = buildEventFieldConfidenceMap([
      {
        targetCollection: 'events',
        field: 'venueWikidataUri',
        confidence: 'confirmed',
        source: 'phase-a-haiku',
        timestamp: '2026-06-01T00:00:00.000Z',
      },
    ])

    expect(map.venueWikidataUri).toMatchObject({
      source: 'phase-a-haiku',
      confidence: 'high',
      confirmed: true,
    })
  })

  it('merges timeline and session drafts', () => {
    const timelinePatch = buildEventPatchFromTimeline([
      {
        targetCollection: 'events',
        field: 'descriptionShort',
        value: 'Short from chat',
      },
    ])
    const draftPatch = buildEventDraftPatchFromSession({
      agentDraftDescriptionLong: 'Long draft body',
      agentDraftConceptualKeywords: [{ keyword: 'urban density' }],
    })

    expect(timelinePatch.descriptionShort).toBe('Short from chat')
    expect(draftPatch.descriptionLong).toMatchObject({ root: expect.any(Object) })
    expect(draftPatch.conceptualKeywords).toEqual([{ keyword: 'urban density' }])
  })
})

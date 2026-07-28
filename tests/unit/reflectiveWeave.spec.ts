import { describe, expect, it } from 'vitest'

import {
  buildAchSessionBlock,
  buildDcsSessionBlock,
  buildReflectiveWeaveBlock,
  buildSessionCloseBlock,
  buildVisionPhaseBlock,
  buildWhereHasThisLivedBlock,
} from '@/lib/artOfficial/promptBlocks'

describe('reflective weave prompt blocks', () => {
  it('defines weave, staging-as-you-go, and extension caps', () => {
    const block = buildReflectiveWeaveBlock()
    expect(block).toContain('REFLECTIVE CORE')
    expect(block).toContain('After no more than two practical')
    expect(block).toContain('stage it immediately')
    expect(block).toContain('intent')
    expect(block).toContain('seriesContext')
    expect(block).toContain('DEFERRABLE')
  })

  it('requires reflective close-gate before wrap-up', () => {
    const block = buildSessionCloseBlock()
    expect(block).toContain('REFLECTIVE CLOSE-GATE')
    expect(block).toContain('makingNote')
    expect(block).toContain('encounterNote')
    expect(block).toContain('firstImpression')
    expect(block).toContain('secondDescription')
    expect(block).toContain('WHERE-HAS-THIS-LIVED CLOSE-GATE')
    expect(block).toContain('Do NOT invite wrap-up')
  })

  it('keeps first-sight acknowledgment short and defers deep re-ask', () => {
    const block = buildVisionPhaseBlock()
    expect(block).toContain('2-4 sentences')
    expect(block).toContain('Do NOT perform the full blind-vs-image reconciliation here')
    expect(block).toContain('formal late-session re-ask tied to firstImpression')
  })

  it('marks where-has-this-lived as mandatory with explicit deferral only', () => {
    const block = buildWhereHasThisLivedBlock()
    expect(block).toContain('mandatory in every artwork-cataloguing session')
    expect(block).toContain('deferred only when the artist explicitly says to come back later')
    expect(block).toContain('salesRecord')
    expect(block).toContain('insuranceValue')
    expect(block).toContain('Do NOT write exhibition history into workContext')
  })

  it('marks DCS edition tiers and stats as deferrable', () => {
    const block = buildDcsSessionBlock()
    expect(block).toContain('DEFERRABLE')
    expect(block).toContain('dcs.editionTiers')
    expect(block).toContain('reflective close-gate')
  })

  it('marks ACH mop and ar as deferrable', () => {
    const block = buildAchSessionBlock()
    expect(block).toContain('DEFERRABLE')
    expect(block).toContain('ach.mop')
    expect(block).toContain('ach.ar')
  })
})

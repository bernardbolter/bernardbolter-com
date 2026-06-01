import { describe, expect, it } from 'vitest'

import {
  buildAchSessionBlock,
  buildDcsSessionBlock,
  buildReflectiveWeaveBlock,
  buildSessionCloseBlock,
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
    expect(block).toContain('Do NOT invite wrap-up')
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

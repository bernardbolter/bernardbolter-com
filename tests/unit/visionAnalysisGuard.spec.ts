import { describe, expect, it } from 'vitest'

import {
  decideMoondreamVisionAppend,
  isHigherTierVisionModel,
  isMoondreamVisionModel,
} from '@/lib/artwork/visionAnalysisGuard'

describe('visionAnalysisGuard', () => {
  it('treats claude models as higher-tier', () => {
    expect(isHigherTierVisionModel('claude-sonnet-4-6')).toBe(true)
    expect(isHigherTierVisionModel('gpt-4o')).toBe(true)
    expect(isMoondreamVisionModel('moondream-station')).toBe(true)
    expect(isHigherTierVisionModel('moondream-station')).toBe(false)
  })

  it('skips append when higher-tier exists', () => {
    expect(
      decideMoondreamVisionAppend([{ model: 'claude-sonnet-4-6' }]),
    ).toEqual({
      action: 'skip',
      reason: 'higher-tier visionAnalyses already present',
    })
  })

  it('skips append when moondream already present', () => {
    expect(
      decideMoondreamVisionAppend([{ model: 'moondream-station' }]),
    ).toEqual({
      action: 'skip',
      reason: 'moondream visionAnalyses already present',
    })
  })

  it('allows append only on empty analyses', () => {
    expect(decideMoondreamVisionAppend([])).toEqual({ action: 'append' })
    expect(decideMoondreamVisionAppend(undefined)).toEqual({ action: 'append' })
  })

  it('fails closed on unknown non-moondream models', () => {
    expect(isHigherTierVisionModel('some-custom-vlm')).toBe(true)
    expect(
      decideMoondreamVisionAppend([{ model: 'some-custom-vlm' }]).action,
    ).toBe('skip')
  })
})

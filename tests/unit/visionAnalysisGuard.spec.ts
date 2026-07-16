import { describe, expect, it } from 'vitest'

import {
  decideMoondreamVisionAppend,
  isHigherTierVisionModel,
  isMoondreamVisionModel,
  visionAnalysisDisplayRank,
} from '@/lib/artwork/visionAnalysisGuard'
import {
  descriptionShortFromProse,
  parseMoondreamHexColors,
  parseMoondreamKeywordList,
} from '@/lib/artwork/moondreamArtworkVisionPrompt'

describe('visionAnalysisGuard', () => {
  it('treats claude models as higher-tier', () => {
    expect(isHigherTierVisionModel('claude-sonnet-4-6')).toBe(true)
    expect(isHigherTierVisionModel('gpt-4o')).toBe(true)
    expect(isMoondreamVisionModel('moondream-station')).toBe(true)
    expect(isHigherTierVisionModel('moondream-station')).toBe(false)
  })

  it('allows append when higher-tier exists (display prefers Claude)', () => {
    expect(decideMoondreamVisionAppend([{ model: 'claude-sonnet-4-6' }])).toEqual({
      action: 'append',
    })
  })

  it('skips append when moondream already present', () => {
    expect(decideMoondreamVisionAppend([{ model: 'moondream-station' }])).toEqual({
      action: 'skip',
      reason: 'moondream visionAnalyses already present',
    })
  })

  it('allows append on empty analyses', () => {
    expect(decideMoondreamVisionAppend([])).toEqual({ action: 'append' })
    expect(decideMoondreamVisionAppend(undefined)).toEqual({ action: 'append' })
  })

  it('ranks higher-tier above moondream for display', () => {
    expect(visionAnalysisDisplayRank('moondream-station')).toBe(0)
    expect(visionAnalysisDisplayRank('claude-sonnet-4-6')).toBe(2)
  })
})

describe('moondream artwork parsers', () => {
  it('parses hex colours from noisy Moondream output', () => {
    expect(parseMoondreamHexColors('Colors: #AbC, #112233, not-a-color, #112233')).toEqual([
      '#aabbcc',
      '#112233',
    ])
  })

  it('parses keyword lists', () => {
    expect(parseMoondreamKeywordList('Urban skyline, Collage, architectural facade')).toEqual([
      'urban skyline',
      'collage',
      'architectural facade',
    ])
  })

  it('builds a short description from prose', () => {
    const prose =
      'A figure stands above a city. Towers rise in the distance. More detail follows here.'
    expect(descriptionShortFromProse(prose)).toBe(
      'A figure stands above a city. Towers rise in the distance.',
    )
  })
})

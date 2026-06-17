import { describe, expect, it } from 'vitest'

import {
  isCataloguingFieldsComplete,
  resolveAutoPhase,
  VISION_DIALOGUE_TURNS,
} from '@/lib/artOfficial/phaseAutoAdvance'
import { resolveModel } from '@/lib/artOfficial/sessionPhase'

describe('resolveModel', () => {
  it('routes artwork-cataloguing phases to the correct tiers', () => {
    expect(resolveModel('pre-upload', 'artwork-cataloguing')).toContain('haiku')
    expect(resolveModel('vision', 'artwork-cataloguing')).toContain('sonnet')
    expect(resolveModel('identity', 'artwork-cataloguing')).toContain('haiku')
    expect(resolveModel('intent', 'artwork-cataloguing')).toContain('sonnet')
  })

  it('uses Sonnet for non-cataloguing sessions', () => {
    expect(resolveModel('intent', 'biography')).toContain('sonnet')
  })
})

describe('resolveAutoPhase', () => {
  const completeTimeline = [
    { field: 'title', value: 'Prophecy' },
    { field: 'yearCreated', value: 2007 },
    { field: 'medium', value: 'digital composite' },
    { field: 'city', value: 'Münster' },
    { field: 'widthWhole', value: 48 },
    { field: 'heightWhole', value: 48 },
    { field: 'dimensionUnit', value: 'in' },
    { field: 'sizeTier', value: 'md' },
  ]

  it('advances pre-upload to vision on primary upload', () => {
    const result = resolveAutoPhase({
      sessionType: 'artwork-cataloguing',
      currentPhase: 'pre-upload',
      hasPrimaryImage: false,
      primaryUploadThisTurn: true,
      tokenLog: [],
      fieldUpdateTimeline: [],
    })
    expect(result.phase).toBe('vision')
    expect(result.transitioned).toBe(true)
  })

  it('skips vision when cataloguing is already complete (recovery)', () => {
    const result = resolveAutoPhase({
      sessionType: 'artwork-cataloguing',
      currentPhase: 'pre-upload',
      hasPrimaryImage: true,
      tokenLog: Array.from({ length: 10 }, (_, i) => ({
        turn: i + 1,
        phase: 'pre-upload',
      })),
      fieldUpdateTimeline: completeTimeline,
    })
    expect(result.phase).toBe('intent')
  })

  it('advances vision to identity after dialogue turns', () => {
    const tokenLog = Array.from({ length: VISION_DIALOGUE_TURNS }, (_, i) => ({
      turn: i + 1,
      phase: 'vision',
    }))
    const result = resolveAutoPhase({
      sessionType: 'artwork-cataloguing',
      currentPhase: 'vision',
      hasPrimaryImage: true,
      tokenLog,
      fieldUpdateTimeline: [],
    })
    expect(result.phase).toBe('identity')
  })

  it('advances cataloguing to intent when essentials are staged', () => {
    const result = resolveAutoPhase({
      sessionType: 'artwork-cataloguing',
      currentPhase: 'physical',
      hasPrimaryImage: true,
      tokenLog: [],
      fieldUpdateTimeline: completeTimeline,
    })
    expect(result.phase).toBe('intent')
  })
})

describe('isCataloguingFieldsComplete', () => {
  it('requires core factual fields', () => {
    expect(
      isCataloguingFieldsComplete([
        { field: 'title', value: 'Test' },
        { field: 'yearCreated', value: 2020 },
      ]),
    ).toBe(false)

    expect(
      isCataloguingFieldsComplete([
        { field: 'title', value: 'Test' },
        { field: 'yearCreated', value: 2020 },
        { field: 'medium', value: 'oil' },
        { field: 'city', value: 'Berlin' },
        { field: 'widthWhole', value: 100 },
        { field: 'heightWhole', value: 80 },
        { field: 'dimensionUnit', value: 'cm' },
        { field: 'sizeTier', value: 'md' },
      ]),
    ).toBe(true)
  })
})

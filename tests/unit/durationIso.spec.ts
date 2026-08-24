import { describe, expect, it } from 'vitest'

import {
  isIso8601Duration,
  normalizeDurationToIso8601,
  parseDurationToSeconds,
  secondsToIso8601,
} from '@/lib/artwork/durationIso'

describe('durationIso', () => {
  it('parses clock times and ISO-8601', () => {
    expect(parseDurationToSeconds('01:02:03')).toBe(3723)
    expect(parseDurationToSeconds('02:03')).toBe(123)
    expect(parseDurationToSeconds('PT1H2M3S')).toBe(3723)
    expect(parseDurationToSeconds('open-ended loop')).toBeNull()
  })

  it('normalizes parseable values to ISO-8601 and leaves prose', () => {
    expect(normalizeDurationToIso8601('01:02:03')).toBe('PT1H2M3S')
    expect(normalizeDurationToIso8601('PT90S')).toBe('PT1M30S')
    expect(normalizeDurationToIso8601('variable length')).toBe('variable length')
    expect(isIso8601Duration('PT1H2M3S')).toBe(true)
    expect(isIso8601Duration('01:02:03')).toBe(false)
    expect(secondsToIso8601(0)).toBe('PT0S')
  })
})

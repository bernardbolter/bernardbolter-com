import { describe, expect, it } from 'vitest'

import { normalizeEpisodeToken, parseSlateFromTranscript } from '@/lib/workers/parseSlate'

describe('normalizeEpisodeToken', () => {
  it('converts word numbers to e-prefixed codes', () => {
    expect(normalizeEpisodeToken('one')).toBe('e01')
    expect(normalizeEpisodeToken('two')).toBe('e02')
    expect(normalizeEpisodeToken('12')).toBe('e12')
  })

  it('normalizes existing e-prefix codes', () => {
    expect(normalizeEpisodeToken('e1')).toBe('e01')
    expect(normalizeEpisodeToken('e01')).toBe('e01')
  })
})

describe('parseSlateFromTranscript', () => {
  it('parses standard head and tail from test-gate clip', () => {
    const result = parseSlateFromTranscript(
      'Slate. Episode one. Talk. Take one. Here is some reflection about the day. Keeper.',
    )
    expect(result).toEqual({
      episode: 'e01',
      shotType: 'TALK',
      take: 1,
      verdict: 'keeper',
      slateParseStatus: 'parsed',
      locationName: null,
    })
  })

  it('parses verse slate without take', () => {
    const result = parseSlateFromTranscript(
      'Slate episode two verse. Performance lines here. Maybe',
    )
    expect(result.episode).toBe('e02')
    expect(result.shotType).toBe('VERSE')
    expect(result.take).toBeNull()
    expect(result.verdict).toBe('maybe')
    expect(result.slateParseStatus).toBe('parsed')
  })

  it('leaves verdict blank when tail does not match', () => {
    const result = parseSlateFromTranscript(
      'Slate. Episode one. Hook. Take two. Content without a verdict word.',
    )
    expect(result.episode).toBe('e01')
    expect(result.shotType).toBe('HOOK')
    expect(result.take).toBe(2)
    expect(result.verdict).toBeNull()
    expect(result.slateParseStatus).toBe('parsed')
  })

  it('returns not-found when head slate is missing', () => {
    const result = parseSlateFromTranscript('Just talking with no slate at all. Keeper.')
    expect(result.slateParseStatus).toBe('not-found')
    expect(result.episode).toBeNull()
    expect(result.shotType).toBeNull()
    expect(result.verdict).toBe('keeper')
  })

  it('parses b-roll library slate into locationName', () => {
    const result = parseSlateFromTranscript('Slate. B-roll library. Walking through the park.')
    expect(result.slateParseStatus).toBe('parsed')
    expect(result.locationName).toBe('B-roll library')
    expect(result.episode).toBeNull()
  })

  it('returns empty result for blank transcript', () => {
    expect(parseSlateFromTranscript('   ')).toEqual({
      episode: null,
      shotType: null,
      take: null,
      verdict: null,
      slateParseStatus: 'not-found',
      locationName: null,
    })
  })
})

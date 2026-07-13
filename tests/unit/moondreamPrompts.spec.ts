import { describe, expect, it } from 'vitest'

import {
  getMoondreamPrompt,
  MOONDREAM_TAG_SUFFIX,
  parseMoondreamTags,
} from '@/lib/workers/moondreamPrompts'

describe('moondreamPrompts', () => {
  it('uses VERSE prompt when shotType is parsed', () => {
    const prompt = getMoondreamPrompt({
      shotType: 'VERSE',
      slateParseStatus: 'parsed',
      mediaType: 'video-performance',
    })
    expect(prompt).toContain("person's position in frame")
    expect(prompt).toContain(MOONDREAM_TAG_SUFFIX)
  })

  it('uses photo prompt for photo mediaType regardless of shotType', () => {
    const prompt = getMoondreamPrompt({
      shotType: 'VERSE',
      slateParseStatus: 'parsed',
      mediaType: 'photo',
    })
    expect(prompt).toContain('main subject, setting type')
    expect(prompt).not.toContain("person's position in frame")
  })

  it('falls back to generic prompt when slate parse failed', () => {
    const prompt = getMoondreamPrompt({
      shotType: 'VERSE',
      slateParseStatus: 'not-found',
      mediaType: 'video-performance',
    })
    expect(prompt).toContain('main subject, setting, lighting, notable objects')
  })

  it('falls back to generic prompt when shotType is blank', () => {
    const prompt = getMoondreamPrompt({
      shotType: null,
      mediaType: 'video-broll',
    })
    expect(prompt).toContain('main subject, setting, lighting, notable objects')
  })

  it('parses comma-separated tags to lowercase trimmed array', () => {
    expect(parseMoondreamTags('Man,  FOUNTAIN, Afternoon Light,')).toEqual([
      'man',
      'fountain',
      'afternoon light',
    ])
  })
})

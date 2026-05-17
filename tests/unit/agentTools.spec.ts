import { describe, expect, it } from 'vitest'

import {
  parseToolArgs,
  TOOL_LOOKUP_COMMONS_FILE,
  TOOL_SEARCH_WIKIDATA,
  TOOL_UPDATE_FIELD,
} from '@/lib/artOfficial/agentTools'

describe('parseToolArgs', () => {
  it('accepts valid update_field', () => {
    const result = parseToolArgs(TOOL_UPDATE_FIELD, {
      targetCollection: 'artworks',
      field: 'descriptionShort',
      value: 'Test',
      confidence: 'confirmed',
      source: 'conversation',
    })
    expect(result.ok).toBe(true)
  })

  it('rejects invalid confidence', () => {
    const result = parseToolArgs(TOOL_UPDATE_FIELD, {
      targetCollection: 'artworks',
      field: 'descriptionShort',
      value: 'Test',
      confidence: 'high',
      source: 'conversation',
    })
    expect(result.ok).toBe(false)
  })

  it('accepts practice-knowledge staging for onboarding', () => {
    const result = parseToolArgs(TOOL_UPDATE_FIELD, {
      targetCollection: 'practice-knowledge',
      field: 'series',
      value: 'Bodies of work include urban watercolours and studio still lifes.',
      confidence: 'confirmed',
      source: 'conversation',
    })
    expect(result.ok).toBe(true)
  })

  it('accepts lookup_commons_file', () => {
    const result = parseToolArgs(TOOL_LOOKUP_COMMONS_FILE, {
      commonsUrl: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
    })
    expect(result.ok).toBe(true)
  })

  it('accepts search_wikidata', () => {
    const result = parseToolArgs(TOOL_SEARCH_WIKIDATA, {
      query: 'Brandenburg Gate',
      limit: 3,
    })
    expect(result.ok).toBe(true)
  })

  it('rejects practice-knowledge with object value', () => {
    const result = parseToolArgs(TOOL_UPDATE_FIELD, {
      targetCollection: 'practice-knowledge',
      field: 'series',
      value: { text: 'not allowed' },
      confidence: 'confirmed',
      source: 'conversation',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('plain-text')
    }
  })
})

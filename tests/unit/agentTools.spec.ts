import { describe, expect, it } from 'vitest'

import { parseToolArgs, TOOL_UPDATE_FIELD } from '@/lib/artOfficial/agentTools'

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
})

import { afterEach, describe, expect, it } from 'vitest'

import {
  buildAnthropicSystemBlocks,
  isPromptCacheEnabled,
  withToolCaching,
} from '@/lib/artOfficial/promptCache'

describe('promptCache', () => {
  afterEach(() => {
    delete process.env.ART_OFFICIAL_PROMPT_CACHE
    delete process.env.ART_OFFICIAL_CACHE_TTL
  })

  it('buildAnthropicSystemBlocks splits cached prefix and dynamic suffix when enabled', () => {
    delete process.env.ART_OFFICIAL_PROMPT_CACHE
    const blocks = buildAnthropicSystemBlocks({
      cachedPrefix: 'CACHED PART',
      dynamicSuffix: 'DYNAMIC PART',
    })

    expect(blocks).toHaveLength(2)
    expect(blocks[0]?.text).toBe('CACHED PART')
    expect(blocks[0]?.cache_control).toEqual({ type: 'ephemeral', ttl: '5m' })
    expect(blocks[1]?.text).toBe('DYNAMIC PART')
    expect(blocks[1]?.cache_control).toBeUndefined()
  })

  it('withToolCaching marks only the last tool', () => {
    const tools = withToolCaching([
      { name: 'a', description: 'A', input_schema: { type: 'object', properties: {} } },
      { name: 'b', description: 'B', input_schema: { type: 'object', properties: {} } },
    ])

    expect(tools[0]?.cache_control).toBeUndefined()
    expect(tools[1]?.cache_control).toEqual({ type: 'ephemeral', ttl: '5m' })
  })

  it('respects ART_OFFICIAL_PROMPT_CACHE=false', () => {
    process.env.ART_OFFICIAL_PROMPT_CACHE = 'false'
    const blocks = buildAnthropicSystemBlocks({
      cachedPrefix: 'A',
      dynamicSuffix: 'B',
    })

    expect(isPromptCacheEnabled()).toBe(false)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.text).toContain('A')
    expect(blocks[0]?.text).toContain('B')
    expect(blocks[0]?.cache_control).toBeUndefined()
  })
})

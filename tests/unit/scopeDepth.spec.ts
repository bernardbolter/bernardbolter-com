import { describe, expect, it } from 'vitest'

import { buildScopeDepthEnvelope } from '@/lib/corpus/scopeDepth'

describe('buildScopeDepthEnvelope', () => {
  it('maps ladder endpoints to scope × depth with tier shorthand', () => {
    expect(buildScopeDepthEnvelope('index')).toEqual({
      'art-official:scope': 'corpus',
      'art-official:depth': 'gist',
      'art-official:tier': 1,
    })
    expect(buildScopeDepthEnvelope('index', { hasActiveFilters: true })).toEqual({
      'art-official:scope': 'subset',
      'art-official:depth': 'gist',
      'art-official:tier': 1,
    })
    expect(buildScopeDepthEnvelope('survey')).toEqual({
      'art-official:scope': 'subset',
      'art-official:depth': 'survey',
      'art-official:tier': 2,
    })
    expect(buildScopeDepthEnvelope('record')).toEqual({
      'art-official:scope': 'work',
      'art-official:depth': 'record',
      'art-official:tier': 4,
    })
    expect(buildScopeDepthEnvelope('sessions')).toEqual({
      'art-official:scope': 'work',
      'art-official:depth': 'sessions',
      'art-official:tier': 5,
    })
  })

  it('omits art-official:tier on the root bulk-export feed', () => {
    const envelope = buildScopeDepthEnvelope('root')
    expect(envelope).toEqual({
      'art-official:scope': 'corpus',
      'art-official:depth': 'record',
      'art-official:feedRole': 'bulk-export',
    })
    expect(envelope).not.toHaveProperty('art-official:tier')
  })
})

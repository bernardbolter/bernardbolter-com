import { describe, expect, it } from 'vitest'

import { buildScopeDepthEnvelope } from '@/lib/corpus/scopeDepth'

describe('buildScopeDepthEnvelope', () => {
  it('maps ladder endpoints to scope × depth with tier shorthand', () => {
    expect(buildScopeDepthEnvelope('index')).toEqual({
      'artism:scope': 'corpus',
      'artism:depth': 'gist',
      'artism:tier': 1,
    })
    expect(buildScopeDepthEnvelope('index', { hasActiveFilters: true })).toEqual({
      'artism:scope': 'subset',
      'artism:depth': 'gist',
      'artism:tier': 1,
    })
    expect(buildScopeDepthEnvelope('survey')).toEqual({
      'artism:scope': 'subset',
      'artism:depth': 'survey',
      'artism:tier': 2,
    })
    expect(buildScopeDepthEnvelope('record')).toEqual({
      'artism:scope': 'work',
      'artism:depth': 'record',
      'artism:tier': 4,
    })
    expect(buildScopeDepthEnvelope('sessions')).toEqual({
      'artism:scope': 'work',
      'artism:depth': 'sessions',
      'artism:tier': 5,
    })
  })

  it('omits artism:tier on the root bulk-export feed', () => {
    const envelope = buildScopeDepthEnvelope('root')
    expect(envelope).toEqual({
      'artism:scope': 'corpus',
      'artism:depth': 'record',
      'artism:feedRole': 'bulk-export',
    })
    expect(envelope).not.toHaveProperty('artism:tier')
  })
})

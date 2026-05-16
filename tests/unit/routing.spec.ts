import { describe, expect, it } from 'vitest'

import { commitTarget, requiresArtwork, SESSION_TYPES } from '@/lib/artOfficial/routing'

describe('routing', () => {
  it('covers all session types', () => {
    for (const t of SESSION_TYPES) {
      expect(commitTarget(t)).toBeDefined()
      expect(typeof requiresArtwork(t)).toBe('boolean')
    }
  })

  it('artwork-cataloguing requires artwork', () => {
    expect(requiresArtwork('artwork-cataloguing')).toBe(true)
    expect(commitTarget('artwork-cataloguing')).toEqual({ kind: 'create-artwork' })
  })
})

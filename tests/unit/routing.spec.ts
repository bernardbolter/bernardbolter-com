import { describe, expect, it } from 'vitest'

import { commitTarget, requiresTriptych } from '@/lib/artOfficial/routing'

describe('routing', () => {
  it('maps triptych-cataloguing to create-triptych commit', () => {
    expect(commitTarget('triptych-cataloguing')).toEqual({ kind: 'create-triptych' })
  })

  it('maps sequencing to apply-sequencing commit', () => {
    expect(commitTarget('sequencing')).toEqual({ kind: 'apply-sequencing' })
  })

  it('requiresTriptych only for triptych sessions', () => {
    expect(requiresTriptych('triptych-cataloguing')).toBe(true)
    expect(requiresTriptych('artwork-cataloguing')).toBe(false)
  })
})

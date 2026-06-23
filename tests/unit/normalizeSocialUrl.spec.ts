import { describe, expect, it } from 'vitest'

import { normalizeSocialUrl } from '@/utilities/normalizeSocialUrl'

describe('normalizeSocialUrl', () => {
  it('turns an Instagram handle into an absolute profile URL', () => {
    expect(normalizeSocialUrl('@bernardbolter', 'instagram')).toBe(
      'https://www.instagram.com/bernardbolter/',
    )
  })

  it('preserves an absolute Instagram URL', () => {
    expect(normalizeSocialUrl('https://www.instagram.com/bernardbolter/', 'instagram')).toBe(
      'https://www.instagram.com/bernardbolter/',
    )
  })

  it('adds https to a bare domain URL', () => {
    expect(normalizeSocialUrl('instagram.com/bernardbolter', 'instagram')).toBe(
      'https://instagram.com/bernardbolter',
    )
  })
})

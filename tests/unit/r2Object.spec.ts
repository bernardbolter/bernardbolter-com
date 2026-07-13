import { afterEach, describe, expect, it, vi } from 'vitest'

import { objectKeyFromPublicUrl } from '@/lib/media/r2Object'

describe('objectKeyFromPublicUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('decodes percent-encoded umlauts in the pathname', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_DOMAIN', 'https://cdn.example.com')
    const url = 'https://cdn.example.com/dennewitz-stra%C3%9Fe-1905.jpg'
    expect(objectKeyFromPublicUrl(url)).toBe('dennewitz-straße-1905.jpg')
  })

  it('decodes spaces in filenames', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_DOMAIN', 'https://cdn.example.com')
    const url = 'https://cdn.example.com/Image%2001.06.26%20at%2022.07.jpeg'
    expect(objectKeyFromPublicUrl(url)).toBe('Image 01.06.26 at 22.07.jpeg')
  })

  it('normalizes literal spaces via URL parsing', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_DOMAIN', 'https://cdn.example.com')
    const url = 'https://cdn.example.com/Image 01.06.26 at 22.07.jpeg'
    expect(objectKeyFromPublicUrl(url)).toBe('Image 01.06.26 at 22.07.jpeg')
  })

  it('strips cache-bust query params before resolving the key', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_DOMAIN', 'https://cdn.example.com')
    const url = 'https://cdn.example.com/gates-iii.jpg?v=abc'
    expect(objectKeyFromPublicUrl(url)).toBe('gates-iii.jpg')
  })
})

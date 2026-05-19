import { describe, expect, it } from 'vitest'

import { defaultMediaAlt } from '@/lib/artOfficial/uploadMedia'

describe('defaultMediaAlt', () => {
  it('strips extension for alt text', () => {
    expect(defaultMediaAlt({ name: 'berlin-gate.jpg' } as File)).toBe('berlin-gate')
  })

  it('falls back when name is only extension', () => {
    expect(defaultMediaAlt({ name: '.jpg' } as File)).toBe('Artwork image')
  })
})

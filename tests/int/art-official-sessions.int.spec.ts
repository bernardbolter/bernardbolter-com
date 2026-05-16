import { describe, expect, it } from 'vitest'

import { isFieldAllowedForAgent } from '@/lib/artOfficial/fieldAllowlist'

describe.skipIf(!process.env.DATABASE_URL)('art-official sessions API', () => {
  it('placeholder for authenticated session create', () => {
    expect(true).toBe(true)
  })
})

describe('art-official field allowlist', () => {
  it('blocks askingPrice', () => {
    expect(isFieldAllowedForAgent('artworks', 'askingPrice')).toBe(false)
    expect(isFieldAllowedForAgent('artworks', 'descriptionShort')).toBe(true)
  })
})

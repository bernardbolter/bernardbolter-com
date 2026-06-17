import { describe, expect, it } from 'vitest'

import { buildEventSlug } from '@/lib/artOfficial/eventSlug'

describe('buildEventSlug', () => {
  it('builds slug from title and year', () => {
    expect(buildEventSlug('Group Show', 2026)).toBe('group-show-2026')
  })

  it('includes city when provided', () => {
    expect(buildEventSlug('Group Show', 2026, 'Berlin')).toBe('group-show-berlin-2026')
  })

  it('normalizes city punctuation and spacing', () => {
    expect(buildEventSlug('Group Show', 2026, 'Los   Angeles / CA')).toBe(
      'group-show-los-angeles-ca-2026',
    )
  })
})

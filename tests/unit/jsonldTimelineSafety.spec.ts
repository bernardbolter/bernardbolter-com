import { describe, expect, it } from 'vitest'

import { buildArtworkJsonLd } from '@/lib/jsonld/artwork'
import type { Artwork } from '@/payload-types'

describe('buildArtworkJsonLd timeline safety', () => {
  it('never emits timelineDate or dateDisplay', () => {
    const artwork = {
      id: 1,
      title: 'Test work',
      slug: 'test-work',
      yearCreated: 2019,
      timelineDate: '2019-06-15T00:00:00.000Z',
      dateDisplay: 'c. 2019',
      status: 'published',
      updatedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
    } as Artwork

    const jsonLd = buildArtworkJsonLd(artwork, null, {
      baseUrl: 'https://bernardbolter.com',
    })

    const serialized = JSON.stringify(jsonLd)
    expect(serialized).not.toContain('timelineDate')
    expect(serialized).not.toContain('dateDisplay')
    expect(serialized).toContain('2019')
  })
})

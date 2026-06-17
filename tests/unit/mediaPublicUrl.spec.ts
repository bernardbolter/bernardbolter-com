import { describe, expect, it } from 'vitest'

import { getDisplayImageUrl } from '@/helpers/artworkCatalog'
import { mediaPublicUrl } from '@/lib/media/publicUrl'
import type { Artwork } from '@/payload-types'

describe('mediaPublicUrl', () => {
  it('appends updatedAt as a cache-busting query param', () => {
    expect(
      mediaPublicUrl({
        url: 'https://cdn.example.com/art.jpg',
        updatedAt: '2026-06-02T12:00:00.000Z',
        filename: 'art.jpg',
      }),
    ).toBe('https://cdn.example.com/art.jpg?v=2026-06-02T12%3A00%3A00.000Z')
  })

  it('uses & when the base URL already has query params', () => {
    expect(
      mediaPublicUrl({
        url: 'https://cdn.example.com/art.jpg?token=abc',
        updatedAt: '2026-06-02T12:00:00.000Z',
        filename: 'art.jpg',
      }),
    ).toBe('https://cdn.example.com/art.jpg?token=abc&v=2026-06-02T12%3A00%3A00.000Z')
  })
})

describe('getDisplayImageUrl', () => {
  it('returns a versioned primary image URL', () => {
    expect(
      getDisplayImageUrl({
        primaryImage: {
          id: 1,
          url: '/media/a.jpg',
          updatedAt: '2026-06-02T12:00:00.000Z',
        } as Artwork['primaryImage'],
        posterImage: null,
      }),
    ).toBe('/media/a.jpg?v=2026-06-02T12%3A00%3A00.000Z')
  })
})

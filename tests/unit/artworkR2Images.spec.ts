import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  derivativeObjectKey,
  derivativePublicUrl,
  getArtworkImageSources,
  getArtworkOriginalImageUrl,
} from '@/lib/media/artworkR2Images'

describe('artworkR2Images', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds derivative keys and URLs from slug', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_DOMAIN', 'https://cdn.example.com')
    expect(derivativeObjectKey('basel-switzerland', '400w')).toBe('basel-switzerland-400w.jpg')
    expect(derivativePublicUrl('basel-switzerland', '1200w')).toBe(
      'https://cdn.example.com/basel-switzerland-1200w.jpg',
    )
  })

  it('returns original URL without cache-bust query', () => {
    const artwork = {
      primaryImage: {
        url: 'https://cdn.example.com/basel-switzerland-composite.jpg?v=abc',
      },
    }

    expect(getArtworkOriginalImageUrl(artwork)).toBe(
      'https://cdn.example.com/basel-switzerland-composite.jpg',
    )
  })

  it('selects derivative src with original fallback by context', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_DOMAIN', 'https://cdn.example.com')
    const artwork = {
      slug: 'basel-switzerland',
      primaryImage: {
        url: 'https://cdn.example.com/basel-switzerland-composite.jpg',
      },
    }

    expect(getArtworkImageSources(artwork, 'grid')).toEqual({
      src: 'https://cdn.example.com/basel-switzerland-400w.jpg',
      fallback: 'https://cdn.example.com/basel-switzerland-composite.jpg',
    })

    expect(getArtworkImageSources(artwork, 'timeline')).toEqual({
      src: 'https://cdn.example.com/basel-switzerland-800w.jpg',
      fallback: 'https://cdn.example.com/basel-switzerland-composite.jpg',
    })

    expect(getArtworkImageSources(artwork, 'artwork-page')).toEqual({
      src: 'https://cdn.example.com/basel-switzerland-800w.jpg',
      fallback: 'https://cdn.example.com/basel-switzerland-composite.jpg',
    })
  })
})

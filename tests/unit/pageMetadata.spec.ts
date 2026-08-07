import { describe, expect, it } from 'vitest'

import { buildPageMetadata } from '@/lib/seo/pageMetadata'

describe('buildPageMetadata', () => {
  it('wires description, openGraph, and twitter from the same source', () => {
    const meta = buildPageMetadata({
      title: 'Bio',
      description: 'Biography of Bernard Bolter.',
      path: '/bio',
    })

    expect(meta.description).toBe('Biography of Bernard Bolter.')
    expect(meta.alternates).toEqual({ canonical: '/bio' })
    expect(meta.openGraph).toMatchObject({
      title: 'Bio',
      description: 'Biography of Bernard Bolter.',
      url: 'https://bernardbolter.com/bio',
      type: 'website',
    })
    expect(meta.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Bio',
      description: 'Biography of Bernard Bolter.',
    })
  })
})

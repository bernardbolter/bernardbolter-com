import { describe, expect, it } from 'vitest'

import { resolveArtworkSeo } from '@/lib/artwork/seo'

describe('resolveArtworkSeo', () => {
  it('uses meta fields when set', () => {
    expect(
      resolveArtworkSeo({
        title: 'Basel',
        descriptionShort: 'Short catalogue line.',
        metaTitle: 'Custom title',
        metaDescription: 'Custom meta blurb.',
      }),
    ).toEqual({
      title: 'Custom title',
      description: 'Custom meta blurb.',
    })
  })

  it('falls back to title and descriptionShort when meta fields are empty', () => {
    expect(
      resolveArtworkSeo({
        title: 'Basel',
        descriptionShort: 'Short catalogue line.',
        metaTitle: null,
        metaDescription: '',
      }),
    ).toEqual({
      title: 'Basel',
      description: 'Short catalogue line.',
    })
  })
})

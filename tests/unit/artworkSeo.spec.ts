import { describe, expect, it } from 'vitest'

import {
  buildArtworkLabelDescription,
  resolveArtworkSeo,
} from '../../src/lib/artwork/seo'
import { truncateAtWordBoundary } from '../../src/lib/seo/truncateAtWordBoundary'

describe('truncateAtWordBoundary', () => {
  it('leaves short strings alone', () => {
    expect(truncateAtWordBoundary('Short line.', 155)).toBe('Short line.')
  })

  it('never cuts mid-word', () => {
    const text =
      'The Thinker takes Rodin seated pose and stretches it into an attenuated standing vertical form whose bent arm and resting head survive the transformation intact even as the body is pulled longer.'
    const out = truncateAtWordBoundary(text, 80)
    expect(out.length).toBeLessThanOrEqual(80)
    expect(out.endsWith(' ')).toBe(false)
    expect(text.startsWith(out)).toBe(true)
    const nextChar = text[out.length]
    expect(nextChar === undefined || nextChar === ' ').toBe(true)
  })
})

describe('resolveArtworkSeo', () => {
  it('uses meta fields when set', () => {
    expect(
      resolveArtworkSeo({
        title: 'Basel',
        descriptionShort: 'Short catalogue line.',
        metaTitle: 'Custom title',
        metaDescription: 'Custom meta blurb.',
        intent: 'Intent prose.',
        yearCreated: 2007,
        medium: 'oil-on-canvas',
        series: { id: 1, name: 'Megacities' } as never,
      }),
    ).toEqual({
      title: 'Custom title',
      description: 'Custom meta blurb.',
    })
  })

  it('falls back descriptionShort → intent → label line', () => {
    expect(
      resolveArtworkSeo({
        title: 'Basel',
        descriptionShort: 'Short catalogue line.',
        metaTitle: null,
        metaDescription: '',
        intent: 'Intent prose that should not win.',
        yearCreated: 2007,
        medium: null,
        series: null,
      }).description,
    ).toBe('Short catalogue line.')

    expect(
      resolveArtworkSeo({
        title: 'The Thinker',
        descriptionShort: null,
        metaTitle: null,
        metaDescription: null,
        intent:
          'To make a finished, ambitious painting very early in a self-taught practice — testing perspective and landscape construction in the same piece, while reinterpreting Rodin.',
        yearCreated: 1993,
        medium: 'oil-on-canvas',
        series: { id: 9, name: 'OG Oil Paintings' } as never,
      }).description,
    ).toMatch(/^To make a finished/)

    expect(
      resolveArtworkSeo({
        title: 'Yugograd',
        descriptionShort: null,
        metaTitle: null,
        metaDescription: null,
        intent: null,
        yearCreated: 2021,
        medium: 'digital-composite',
        series: { id: 2, name: 'Megacities' } as never,
      }).description,
    ).toBe(buildArtworkLabelDescription({
      title: 'Yugograd',
      yearCreated: 2021,
      medium: 'digital-composite',
      series: { id: 2, name: 'Megacities' } as never,
    }))
  })
})

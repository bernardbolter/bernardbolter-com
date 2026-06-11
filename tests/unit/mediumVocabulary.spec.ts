import { describe, expect, it } from 'vitest'

import {
  BUILTIN_MEDIUM_AAT,
  aatTermCodeFromUri,
  buildArtMediumJsonLdValue,
  buildDefinedTermMedium,
  lookupMediumAatUri,
  resolveMediumLabel,
} from '@/lib/artwork/mediumVocabulary'
import type { Artwork } from '@/payload-types'

describe('mediumVocabulary', () => {
  it('extracts AAT term code from Getty URI', () => {
    expect(aatTermCodeFromUri('http://vocab.getty.edu/aat/300014666')).toBe('300014666')
  })

  it('builds DefinedTerm JSON-LD for artMedium', () => {
    expect(
      buildDefinedTermMedium('Acrylic on canvas', 'http://vocab.getty.edu/aat/300014666'),
    ).toEqual({
      '@type': 'DefinedTerm',
      name: 'Acrylic on canvas',
      inDefinedTermSet: 'http://vocab.getty.edu/aat/',
      termCode: '300014666',
      sameAs: 'http://vocab.getty.edu/aat/300014666',
    })
  })

  it('resolves medium label from built-in slug', () => {
    const artwork = {
      medium: 'acrylic-on-canvas',
      mediumOther: null,
    } as Artwork
    expect(resolveMediumLabel(artwork)).toBe('Acrylic on canvas')
  })

  it('prefers mediumOther when medium is other', () => {
    const artwork = {
      medium: 'other',
      mediumOther: 'Encaustic on panel',
    } as Artwork
    expect(resolveMediumLabel(artwork)).toBe('Encaustic on panel')
  })

  it('looks up custom medium AAT URI', () => {
    expect(
      lookupMediumAatUri('custom-medium', [
        { value: 'custom-medium', label: 'Custom', aatUri: 'http://vocab.getty.edu/aat/300123456' },
      ]),
    ).toBe('http://vocab.getty.edu/aat/300123456')
  })

  it('emits DefinedTerm when artwork has mediumAatUri', () => {
    const artwork = {
      medium: 'acrylic-on-canvas',
      mediumAatUri: 'http://vocab.getty.edu/aat/300014666',
    } as Artwork

    const value = buildArtMediumJsonLdValue(artwork)
    expect(value).toMatchObject({
      '@type': 'DefinedTerm',
      name: 'Acrylic on canvas',
      sameAs: 'http://vocab.getty.edu/aat/300014666',
    })
  })

  it('emits plain string when no AAT URI is known', () => {
    const original = { ...BUILTIN_MEDIUM_AAT }
    for (const key of Object.keys(BUILTIN_MEDIUM_AAT)) {
      delete BUILTIN_MEDIUM_AAT[key]
    }

    const artwork = {
      medium: 'digital',
      mediumAatUri: null,
    } as Artwork

    expect(buildArtMediumJsonLdValue(artwork)).toBe('Digital')

    Object.assign(BUILTIN_MEDIUM_AAT, original)
  })
})

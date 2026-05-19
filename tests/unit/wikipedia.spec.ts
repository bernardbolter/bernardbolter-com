import { describe, expect, it } from 'vitest'

import { wikipediaSectionHtmlToPlain } from '@/lib/artOfficial/externalLookups/wikipedia'

describe('wikipediaSectionHtmlToPlain', () => {
  it('passes through HTML strings', () => {
    expect(wikipediaSectionHtmlToPlain('<p>Hello</p>')).toBe('<p>Hello</p>')
  })

  it('unwraps MediaWiki object form', () => {
    expect(wikipediaSectionHtmlToPlain({ '*': '<p>Wrapped</p>' })).toBe('<p>Wrapped</p>')
  })

  it('returns empty string for unexpected shapes', () => {
    expect(wikipediaSectionHtmlToPlain(null)).toBe('')
    expect(wikipediaSectionHtmlToPlain(42)).toBe('')
    expect(wikipediaSectionHtmlToPlain({ html: '<p>nope</p>' })).toBe('')
  })
})

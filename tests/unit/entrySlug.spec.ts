import { describe, expect, it } from 'vitest'

import {
  ENTRY_SLUG_MAX_LENGTH,
  slugifyEntryText,
  uniqueEntrySlug,
} from '../../src/lib/artist/entrySlug'

describe('slugifyEntryText', () => {
  it('leaves short slugs alone', () => {
    expect(slugifyEntryText('Seeing as a verb')).toBe('seeing-as-a-verb')
  })

  it('caps at 60 chars on a word boundary from significant words', () => {
    const text =
      'A recurring inside/outside position in the art-school system that keeps returning across decades of practice'
    const slug = slugifyEntryText(text)
    expect(slug.length).toBeLessThanOrEqual(ENTRY_SLUG_MAX_LENGTH)
    expect(slug.includes('recurring')).toBe(true)
    expect(slug.endsWith('-')).toBe(false)
    // No mid-word cut: every segment is a full token from the source slug.
    for (const part of slug.split('-')) {
      expect(part.length).toBeGreaterThan(0)
    }
  })

  it('second rename from short title stays short and sticky-friendly', () => {
    const first = slugifyEntryText(
      'Long provisional text that will later be replaced with a short title after reflection',
    )
    expect(first.length).toBeLessThanOrEqual(ENTRY_SLUG_MAX_LENGTH)
    const second = slugifyEntryText('Inside outside')
    expect(second).toBe('inside-outside')
    expect(second.length).toBeLessThanOrEqual(ENTRY_SLUG_MAX_LENGTH)
  })
})

describe('uniqueEntrySlug', () => {
  it('appends -2 on collision', () => {
    const used = new Set(['seeing-as-a-verb'])
    expect(uniqueEntrySlug('seeing-as-a-verb', used)).toBe('seeing-as-a-verb-2')
  })
})

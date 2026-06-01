import { describe, expect, it } from 'vitest'

import {
  isArtworkCommitRootField,
  isFieldAllowedForAgent,
} from '@/lib/artOfficial/fieldAllowlist'

describe('isFieldAllowedForAgent', () => {
  it('allows ACH dotted paths on artworks', () => {
    expect(isFieldAllowedForAgent('artworks', 'ach.overlay.overlayColors')).toBe(true)
  })

  it('blocks commerce fields on artworks', () => {
    expect(isFieldAllowedForAgent('artworks', 'askingPrice')).toBe(false)
    expect(isFieldAllowedForAgent('artworks', 'timelineDate')).toBe(false)
    expect(isFieldAllowedForAgent('artworks', 'dateDisplay')).toBe(false)
  })

  it('allows triptych corpus fields only', () => {
    expect(isFieldAllowedForAgent('triptychs', 'intent')).toBe(true)
    expect(isFieldAllowedForAgent('triptychs', 'descriptionShort')).toBe(true)
  })

  it('blocks triptych commerce and structure fields', () => {
    expect(isFieldAllowedForAgent('triptychs', 'vendureProductId')).toBe(false)
    expect(isFieldAllowedForAgent('triptychs', 'printSets')).toBe(false)
    expect(isFieldAllowedForAgent('triptychs', 'printSets.0.vendureProductId')).toBe(false)
    expect(isFieldAllowedForAgent('triptychs', 'panels')).toBe(false)
    expect(isFieldAllowedForAgent('triptychs', 'originalsBuyer')).toBe(false)
  })

  it('allows tag and support fields for artwork commit', () => {
    for (const field of [
      'movementTags',
      'styleTags',
      'subjectTags',
      'genreTags',
      'periodTags',
      'support',
    ]) {
      expect(isFieldAllowedForAgent('artworks', field)).toBe(true)
      expect(isArtworkCommitRootField(field)).toBe(true)
    }
  })

  it('blocks all small-prints fields', () => {
    expect(isFieldAllowedForAgent('small-prints', 'artwork')).toBe(false)
    expect(isFieldAllowedForAgent('small-prints', 'available')).toBe(false)
  })
})

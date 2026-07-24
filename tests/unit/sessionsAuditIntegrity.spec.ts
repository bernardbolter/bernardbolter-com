import { describe, expect, it } from 'vitest'

import {
  fieldsCoveredFromTimeline,
  formatConflictQuestion,
  isMateriallyDifferent,
  shouldCheckAutomaticConflict,
} from '@/lib/artOfficial/automaticFieldConflicts'
import { checkDescriptionUploadMismatch } from '@/lib/artOfficial/descriptionUploadMismatch'
import {
  clampDescriptionShort,
  validateSelectFieldValue,
} from '@/lib/artOfficial/enumFieldValidation'
import { buildSessionGloss } from '@/lib/corpus/sessionGloss'

describe('automatic field conflicts', () => {
  it('only checks image-analysis / knowledge-base sources', () => {
    expect(shouldCheckAutomaticConflict('dominantColors', 'image-analysis')).toBe(true)
    expect(shouldCheckAutomaticConflict('dominantColors', 'conversation')).toBe(false)
    expect(shouldCheckAutomaticConflict('intent', 'image-analysis')).toBe(false)
  })

  it('treats tag supersets as not materially different', () => {
    expect(isMateriallyDifferent(['a', 'b'], ['a', 'b', 'c'])).toBe(false)
    expect(isMateriallyDifferent(['a', 'b'], ['a', 'c'])).toBe(true)
  })

  it('deduplicates fieldsCovered from timeline', () => {
    expect(
      fieldsCoveredFromTimeline([
        { field: 'title' },
        { field: 'title' },
        { field: 'intent' },
      ]),
    ).toEqual([{ field: 'title' }, { field: 'intent' }])
  })

  it('batches conflict questions', () => {
    const q = formatConflictQuestion([
      { field: 'dominantColors', priorValue: ['#111'], newValue: ['#222'] },
      { field: 'subjectTags', priorValue: ['bridge'], newValue: ['tower'] },
    ])
    expect(q).toContain('2 automatic field')
    expect(q).toContain('dominantColors')
    expect(q).toContain('Ask the artist once')
  })
})

describe('enum / descriptionShort validation', () => {
  it('rejects invalid availabilityStatus', () => {
    const result = validateSelectFieldValue('availabilityStatus', 'for-sale')
    expect(result.ok).toBe(false)
  })

  it('accepts schema location categories', () => {
    expect(validateSelectFieldValue('currentLocation.category', 'artists-studio').ok).toBe(true)
  })

  it('clamps descriptionShort to 400 chars', () => {
    const long = `${'Word. '.repeat(100)}Extra trailing prose that should be cut.`
    expect(clampDescriptionShort(long).length).toBeLessThanOrEqual(400)
  })
})

describe('description/upload mismatch', () => {
  it('flags missing named objects from the blind description', () => {
    const result = checkDescriptionUploadMismatch({
      firstImpression: 'A yellow bus crossing a concrete pyramid plaza',
      compositionalNotes: 'Gray architectural facade with small figures',
      detectedSubjects: ['building', 'figures'],
      dominantColors: ['#999999'],
    })
    expect(result.mismatch).toBe(true)
    expect(result.missingLabels.length).toBeGreaterThan(0)
  })
})

describe('session gloss', () => {
  it('renders cataloguing, revisit, struggle, and conflict variants', () => {
    expect(
      buildSessionGloss({
        sessionType: 'artwork-cataloguing',
        fieldsCoveredThisSession: [{ field: 'a' }, { field: 'b' }],
      }),
    ).toBe('Cataloguing pass — 2 fields confirmed')

    expect(
      buildSessionGloss({
        sessionType: 'artwork-cataloguing',
        fieldsCoveredThisSession: [{ field: 'a' }],
        revisitOf: 12,
        passNumber: 4,
        priorFieldConflicts: [{}, {}],
      }),
    ).toContain('Revisit (4th pass')

    expect(
      buildSessionGloss({
        sessionType: 'artwork-cataloguing',
        fieldsCoveredThisSession: [{ field: 'a' }],
        sessionStruggleFlag: {
          hasStruggle: true,
          struggleTypes: ['commit-error'],
        },
      }),
    ).toContain('commit error flagged')
  })
})

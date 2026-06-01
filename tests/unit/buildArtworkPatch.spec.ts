import { describe, expect, it } from 'vitest'

import {
  buildArtworkDraftPatchFromSession,
  buildArtworkPatchFromTimeline,
  mergeArtworkPatches,
  normalizeConceptualKeywords,
  sanitizeArtworkCommitPatch,
} from '@/lib/artOfficial/buildArtworkPatch'

describe('buildArtworkPatchFromTimeline', () => {
  it('materialises dotted paths into nested artwork patch shape', () => {
    const patch = buildArtworkPatchFromTimeline([
      {
        targetCollection: 'artworks',
        field: 'ach.overlay.overlayColors',
        value: [{ hex: '#7F2B1F' }, { hex: '#E1C16E' }, { hex: '#2E5F87' }],
      },
      {
        targetCollection: 'artworks',
        field: 'ach.location.locationWikidataUri',
        value: 'https://www.wikidata.org/entity/Q82425',
      },
      {
        targetCollection: 'artworks',
        field: 'ach.mop.triptychPosition',
        value: 'II',
      },
    ])

    expect(patch).toEqual({
      ach: {
        overlay: {
          overlayColors: [
            { hex: '#7F2B1F' },
            { hex: '#E1C16E' },
            { hex: '#2E5F87' },
          ],
        },
        location: {
          locationWikidataUri: 'https://www.wikidata.org/entity/Q82425',
        },
        mop: { triptychPosition: 'II' },
      },
    })
  })

  it('converts ACH rich-text fields to lexical when value is plain text', () => {
    const patch = buildArtworkPatchFromTimeline([
      {
        targetCollection: 'artworks',
        field: 'ach.location.conceptCopy',
        value: 'The Brandenburg Gate as a layered witness.',
      },
    ])

    const conceptCopy = (patch.ach as { location: { conceptCopy: unknown } }).location
      .conceptCopy as { root: { children: unknown[] } }
    expect(conceptCopy.root.children).toBeInstanceOf(Array)
  })

  it('materialises tag and support fields at the top level', () => {
    const patch = buildArtworkPatchFromTimeline([
      {
        targetCollection: 'artworks',
        field: 'movementTags',
        value: ['Photomontage', 'New objectivity'],
      },
      {
        targetCollection: 'artworks',
        field: 'support',
        value: 'aluminum-mount',
      },
    ])
    expect(patch.movementTags).toEqual(['Photomontage', 'New objectivity'])
    expect(patch.support).toBe('aluminum-mount')
  })

  it('ignores entries from other collections', () => {
    const patch = buildArtworkPatchFromTimeline([
      {
        targetCollection: 'artists',
        field: 'bioFull',
        value: 'Should be ignored.',
      },
      {
        targetCollection: 'artworks',
        field: 'title',
        value: 'Kept.',
      },
    ])
    expect(patch).toEqual({ title: 'Kept.' })
  })

  it('returns an empty patch when timeline is not an array', () => {
    expect(buildArtworkPatchFromTimeline(null)).toEqual({})
    expect(buildArtworkPatchFromTimeline(undefined)).toEqual({})
    expect(buildArtworkPatchFromTimeline('nope')).toEqual({})
  })
})

describe('normalizeConceptualKeywords', () => {
  it('wraps plain strings as keyword rows', () => {
    expect(normalizeConceptualKeywords(['Gates of Perception', 'memory'])).toEqual([
      { keyword: 'Gates of Perception' },
      { keyword: 'memory' },
    ])
  })

  it('passes through valid rows', () => {
    expect(normalizeConceptualKeywords([{ keyword: 'mediation' }])).toEqual([
      { keyword: 'mediation' },
    ])
  })
})

describe('buildArtworkPatchFromTimeline conceptualKeywords', () => {
  it('normalizes string arrays staged via update_field', () => {
    const patch = buildArtworkPatchFromTimeline([
      {
        targetCollection: 'artworks',
        field: 'conceptualKeywords',
        value: ['Gates of Perception', 'erasure'],
      },
    ])
    expect(patch.conceptualKeywords).toEqual([
      { keyword: 'Gates of Perception' },
      { keyword: 'erasure' },
    ])
  })
})

describe('buildArtworkDraftPatchFromSession', () => {
  it('maps agent draft fields onto artwork patch keys', () => {
    const patch = buildArtworkDraftPatchFromSession({
      agentDraftDescriptionShort: 'Short copy.',
      agentDraftDescriptionLong: 'Long copy.',
      agentDraftConceptualKeywords: ['memory', { keyword: 'mediation' }],
      agentDraftFormalContributionAssessment: 'Formal note.',
    })
    expect(patch.descriptionShort).toBe('Short copy.')
    expect(patch.formalContributionAssessment).toBe('Formal note.')
    expect(patch.conceptualKeywords).toEqual([
      { keyword: 'memory' },
      { keyword: 'mediation' },
    ])
    expect(patch.descriptionLong).toMatchObject({ root: { children: expect.any(Array) } })
  })
})

describe('sanitizeArtworkCommitPatch', () => {
  it('fixes conceptualKeywords on the merged commit payload', () => {
    const out = sanitizeArtworkCommitPatch({
      title: 'Test',
      conceptualKeywords: ['Gates of Perception'],
    })
    expect(out.conceptualKeywords).toEqual([{ keyword: 'Gates of Perception' }])
  })
})

describe('mergeArtworkPatches', () => {
  it('deep-merges nested groups so server overrides client at the leaf', () => {
    const merged = mergeArtworkPatches(
      {
        ach: {
          overlay: { overlayColors: [{ hex: '#000' }] },
          mop: { triptychPosition: 'I' },
        },
      },
      {
        ach: {
          overlay: { overlayColors: [{ hex: '#FFF' }, { hex: '#888' }, { hex: '#444' }] },
        },
      },
    )

    expect(merged).toEqual({
      ach: {
        overlay: {
          overlayColors: [{ hex: '#FFF' }, { hex: '#888' }, { hex: '#444' }],
        },
        mop: { triptychPosition: 'I' },
      },
    })
  })
})

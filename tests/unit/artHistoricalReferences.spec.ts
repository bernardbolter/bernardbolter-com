import { describe, expect, it, vi } from 'vitest'

import {
  resolveArtHistoricalReferencesField,
  validateArtHistoricalReferencesValue,
} from '@/lib/artOfficial/artHistoricalReferences'

describe('validateArtHistoricalReferencesValue', () => {
  it('rejects prose strings (Brandenburger Tor guard)', () => {
    const result = validateArtHistoricalReferencesValue(
      'Rauschenberg transfer drawings relate to the solvent process…',
    )
    expect(result.ok).toBe(false)
  })

  it('rejects non-array values', () => {
    expect(validateArtHistoricalReferencesValue({ name: 'Richter' }).ok).toBe(false)
  })

  it('accepts structured staging entries', () => {
    const result = validateArtHistoricalReferencesValue([
      {
        name: 'Robert Rauschenberg',
        matchStrategy: 'fuzzy-match-or-create',
        relevanceNote: 'Transfer drawings.',
      },
      { name: 'Gerhard Richter', matchStrategy: 'fuzzy-match-or-create' },
    ])
    expect(result).toEqual({ ok: true })
  })

  it('accepts numeric ids', () => {
    expect(validateArtHistoricalReferencesValue([12, 34])).toEqual({ ok: true })
  })
})

describe('resolveArtHistoricalReferencesField', () => {
  it('links existing records by fuzzy artist name and does not duplicate', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [{ id: 5, artistName: 'Robert Rauschenberg', artworkTitle: 'Retroactive I' }],
    })
    const create = vi.fn()
    const payload = { find, create } as never
    const user = { id: 1 } as never
    const patch: Record<string, unknown> = {
      artHistoricalReferences: [
        {
          name: 'Rauschenberg',
          matchStrategy: 'fuzzy-match-or-create',
          relevanceNote: 'Transfer drawings.',
        },
      ],
    }

    await resolveArtHistoricalReferencesField({ payload, user }, patch)

    expect(create).not.toHaveBeenCalled()
    expect(patch.artHistoricalReferences).toEqual([5])
    expect(patch.artHistoricalContext).toBe('Rauschenberg — Transfer drawings.')
  })

  it('creates needsArtistReview stub when no match exists', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    const create = vi.fn().mockResolvedValue({ id: 88 })
    const payload = { find, create } as never
    const patch: Record<string, unknown> = {
      artHistoricalReferences: [
        {
          name: 'Ed Ruscha',
          matchStrategy: 'fuzzy-match-or-create',
          relevanceNote: 'Mountains of the mind.',
        },
      ],
      artHistoricalContext: 'Already drafted prose stays.',
    }

    await resolveArtHistoricalReferencesField({ payload, user: {} as never }, patch)

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'art-historical-references',
        data: expect.objectContaining({
          artistName: 'Ed Ruscha',
          artworkTitle: 'Ed Ruscha',
          needsArtistReview: true,
          notes: 'Mountains of the mind.',
        }),
      }),
    )
    expect(patch.artHistoricalReferences).toEqual([88])
    expect(patch.artHistoricalContext).toBe('Already drafted prose stays.')
  })

  it('matches Last, First ordering against First Last records', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [{ id: 3, artistName: 'René Magritte', artworkTitle: 'The Human Condition' }],
    })
    const payload = { find, create: vi.fn() } as never
    const patch: Record<string, unknown> = {
      artHistoricalReferences: [{ name: 'Magritte, René', matchStrategy: 'fuzzy-match-or-create' }],
    }

    await resolveArtHistoricalReferencesField({ payload, user: {} as never }, patch)

    expect(patch.artHistoricalReferences).toEqual([3])
  })

  it('rethrows schema/query failures so callers can soft-isolate the field', async () => {
    const find = vi.fn().mockRejectedValue(
      Object.assign(new Error('Failed query: select … needs_artist_review …'), {
        cause: new Error('column art_historical_references.needs_artist_review does not exist'),
      }),
    )
    const payload = { find, create: vi.fn() } as never
    const patch: Record<string, unknown> = {
      artHistoricalReferences: [
        { name: 'Robert Rauschenberg', matchStrategy: 'fuzzy-match-or-create' },
      ],
    }

    await expect(
      resolveArtHistoricalReferencesField({ payload, user: {} as never }, patch),
    ).rejects.toThrow(/Failed query/)
  })
})

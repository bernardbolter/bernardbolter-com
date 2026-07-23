import { describe, expect, it, vi } from 'vitest'

import { resolveArtworkCommitReferences } from '@/lib/artOfficial/resolveArtworkCommitReferences'

describe('resolveArtworkCommitReferences', () => {
  it('resolves series slug to relationship id', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 7, slug: 'a-colorful-history' }] })
    const findByID = vi.fn()
    const payload = { find, findByID } as never
    const user = { id: 1 } as never
    const session = { artistId: 2 } as never

    const out = await resolveArtworkCommitReferences(
      { payload, user, session },
      { title: 'Gate', series: 'a-colorful-history', yearCreated: 2024 },
    )

    expect(out.series).toBe(7)
    expect(out.creator).toBe(2)
    expect(out.slug).toBe('gate')
    expect(out.seriesSlug).toBeUndefined()
  })

  it('creates tag records for staged label strings', async () => {
    const find = vi
      .fn()
      .mockResolvedValueOnce({ docs: [{ id: 7, slug: 'digital-city-series' }] })
      .mockResolvedValueOnce({ docs: [] })
    const findByID = vi.fn().mockResolvedValue({ id: 7, slug: 'digital-city-series' })
    const create = vi.fn().mockResolvedValue({ id: 99 })
    const payload = { find, findByID, create } as never
    const user = { id: 1 } as never
    const session = { artistId: 2 } as never

    const out = await resolveArtworkCommitReferences(
      { payload, user, session },
      {
        title: 'Basel',
        series: 'digital-city-series',
        movementTags: ['Photomontage'],
      },
    )

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'tags',
        data: { label: 'Photomontage', type: 'movement' },
      }),
    )
    expect(out.movementTags).toEqual([99])
  })

  it('does not infer sizeTier at commit when not staged in session', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 7, slug: 'digital-city-series' }] })
    const findByID = vi.fn().mockResolvedValue({ id: 7, slug: 'digital-city-series' })
    const payload = { find, findByID, create: vi.fn() } as never

    const out = await resolveArtworkCommitReferences(
      { payload, user: {} as never, session: {} as never },
      {
        series: 'digital-city-series',
        widthWhole: 48,
        heightWhole: 48,
        dimensionUnit: 'in',
      },
    )

    expect(out.sizeTier).toBeUndefined()
  })

  it('normalizes staged sizeTier from session', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 7, slug: 'digital-city-series' }] })
    const findByID = vi.fn().mockResolvedValue({ id: 7, slug: 'digital-city-series' })
    const payload = { find, findByID, create: vi.fn() } as never

    const out = await resolveArtworkCommitReferences(
      { payload, user: {} as never, session: {} as never },
      {
        series: 'digital-city-series',
        sizeTier: 'LG',
      },
    )

    expect(out.sizeTier).toBe('lg')
  })

  it('throws when series slug is unknown', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    const payload = { find, findByID: vi.fn() } as never

    await expect(
      resolveArtworkCommitReferences(
        { payload, user: {} as never, session: {} as never },
        { series: 'missing-series' },
      ),
    ).rejects.toThrow(/not found/i)
  })

  it('registers mediumOther when medium is other and stores the custom slug', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 7, slug: 'a-colorful-history' }] })
    let customMediums: Array<{ value: string; label: string }> = []
    const findGlobal = vi.fn().mockImplementation(async () => ({ customMediums }))
    const updateGlobal = vi.fn().mockImplementation(async ({ data }) => {
      customMediums = data.customMediums ?? []
      return {}
    })
    const payload = {
      find,
      findByID: vi.fn().mockResolvedValue({ id: 7, slug: 'a-colorful-history' }),
      findGlobal,
      updateGlobal,
      db: {},
    } as never

    const out = await resolveArtworkCommitReferences(
      { payload, user: {} as never, session: { artistId: 2 } as never },
      {
        title: 'Gate',
        series: 'a-colorful-history',
        medium: 'other',
        mediumOther: 'Encaustic on panel',
      },
    )

    expect(updateGlobal).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'art-official-settings',
        data: {
          customMediums: [{ value: 'encaustic-on-panel', label: 'Encaustic on panel' }],
        },
      }),
    )
    expect(out.medium).toBe('encaustic-on-panel')
    expect(out.mediumOther).toBeUndefined()
  })
})

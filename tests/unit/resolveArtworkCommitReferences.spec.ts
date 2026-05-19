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
})

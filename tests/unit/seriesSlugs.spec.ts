import { describe, expect, it, vi } from 'vitest'

import {
  assertArtworkSeriesSlugExists,
  buildSeriesSlugPromptBlock,
  findSeriesIdBySlug,
  isSlugDescendantOf,
  type SeriesRecord,
} from '@/lib/artOfficial/seriesSlugs'

describe('seriesSlugs', () => {
  it('findSeriesIdBySlug returns id when present', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 3, slug: 'megacities' }] })
    const id = await findSeriesIdBySlug(
      { payload: { find } as never, user: {} as never },
      'megacities',
    )
    expect(id).toBe(3)
  })

  it('assertArtworkSeriesSlugExists rejects unknown slugs', async () => {
    const find = vi
      .fn()
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [{ id: 1, slug: 'a-colorful-history' }] })

    await expect(
      assertArtworkSeriesSlugExists(
        { payload: { find } as never, user: {} as never },
        'invented-slug',
      ),
    ).rejects.toThrow(/invented-slug/)
  })

  it('buildSeriesSlugPromptBlock annotates sub-series and lists slugs', () => {
    const records: SeriesRecord[] = [
      { id: 1, slug: 'a-colorful-history', parentSeriesId: null },
      { id: 2, slug: 'gates-of-perception', parentSeriesId: 1 },
      { id: 3, slug: 'megacities', parentSeriesId: null },
    ]
    const block = buildSeriesSlugPromptBlock(records)
    expect(block).toContain('a-colorful-history')
    expect(block).toContain('gates-of-perception')
    expect(block).toContain('sub-series of a-colorful-history')
    // ACH descendants should be noted
    expect(block).toContain('ACH sub-series')
  })

  describe('isSlugDescendantOf', () => {
    const records: SeriesRecord[] = [
      { id: 1, slug: 'a-colorful-history', parentSeriesId: null },
      { id: 2, slug: 'gates-of-perception', parentSeriesId: 1 },
      { id: 3, slug: 'megacities', parentSeriesId: null },
    ]

    it('returns true for direct child', () => {
      expect(isSlugDescendantOf(records, 'gates-of-perception', 'a-colorful-history')).toBe(true)
    })

    it('returns true for the slug itself', () => {
      expect(isSlugDescendantOf(records, 'a-colorful-history', 'a-colorful-history')).toBe(true)
    })

    it('returns false for an unrelated series', () => {
      expect(isSlugDescendantOf(records, 'megacities', 'a-colorful-history')).toBe(false)
    })

    it('returns false when ancestor does not exist', () => {
      expect(isSlugDescendantOf(records, 'gates-of-perception', 'nonexistent')).toBe(false)
    })
  })
})

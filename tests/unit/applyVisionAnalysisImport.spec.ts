import { describe, expect, it, vi } from 'vitest'

import { applyVisionAnalysisImport } from '@/lib/studio/applyVisionAnalysisImport'
import type { User } from '@/payload-types'

const user = { id: 1, roles: ['admin'] } as User

describe('applyVisionAnalysisImport', () => {
  it('appends analyses to an existing artwork', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [
        {
          id: 42,
          visionAnalyses: [{ text: 'Existing.', model: 'gpt-4o', date: '2026-01-01' }],
        },
      ],
    })
    const update = vi.fn().mockResolvedValue({})

    const payload = { find, update } as never

    const results = await applyVisionAnalysisImport(payload, user, {
      slug: 'gates-iii',
      analyses: [
        {
          text: '  New analysis.  ',
          model: ' claude-sonnet-4-6 ',
          date: ' 2026-07-11 ',
        },
      ],
    })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'artworks',
        where: { slug: { equals: 'gates-iii' } },
        overrideAccess: false,
        user,
      }),
    )

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'artworks',
        id: 42,
        data: {
          visionAnalyses: [
            { text: 'Existing.', model: 'gpt-4o', date: '2026-01-01' },
            { text: 'New analysis.', model: 'claude-sonnet-4-6', date: '2026-07-11' },
          ],
        },
      }),
    )

    expect(results).toEqual([
      { slug: 'gates-iii', artworkId: 42, appended: 1, total: 2 },
    ])
  })

  it('throws when slug is missing', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      update: vi.fn(),
    } as never

    await expect(
      applyVisionAnalysisImport(payload, user, {
        slug: 'missing-work',
        analyses: [{ text: 'x', model: 'gpt-4o', date: '2026-07-11' }],
      }),
    ).rejects.toThrow(/Artwork not found/)
  })
})

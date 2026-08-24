import { describe, expect, it, vi } from 'vitest'
import { NotFound } from 'payload'

import { artworkBeforeOperation } from '@/hooks/artworkBeforeOperation'

describe('artworkBeforeOperation non-numeric id', () => {
  it('leaves numeric ids unchanged', async () => {
    const args = { id: 86, req: { payload: { find: vi.fn() } } }
    const result = await artworkBeforeOperation({
      args,
      operation: 'read',
      collection: { slug: 'artworks' } as never,
      context: {},
      overrideAccess: false,
      req: args.req as never,
    })
    expect(result).toBe(args)
    expect(args.req.payload.find).not.toHaveBeenCalled()
  })

  it('404s a slug without resolving it to an artwork', async () => {
    const find = vi.fn()
    const req = { payload: { find }, t: undefined }
    await expect(
      artworkBeforeOperation({
        args: { id: 'the-thinker', req },
        operation: 'read',
        collection: { slug: 'artworks' } as never,
        context: {},
        overrideAccess: false,
        req: req as never,
      }),
    ).rejects.toBeInstanceOf(NotFound)
    expect(find).not.toHaveBeenCalled()
  })
})

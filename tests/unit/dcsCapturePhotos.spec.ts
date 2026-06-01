import { describe, expect, it, vi, beforeEach } from 'vitest'

import { dcsCapturePhotosBeforeChange } from '@/hooks/dcsCapturePhotosBeforeChange'

describe('dcsCapturePhotosBeforeChange', () => {
  const update = vi.fn()
  const find = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears isMicroSelection on sibling photos when setting micro on one', async () => {
    find.mockResolvedValue({
      docs: [{ id: 10 }, { id: 11 }],
    })

    await dcsCapturePhotosBeforeChange({
      data: { isMicroSelection: true, parentArtwork: 5 },
      originalDoc: { id: 12 },
      operation: 'update',
      req: {
        payload: { find, update },
      },
    } as never)

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'dcs-capture-photos',
        where: expect.objectContaining({
          and: expect.arrayContaining([
            { parentArtwork: { equals: 5 } },
            { isMicroSelection: { equals: true } },
            { id: { not_equals: 12 } },
          ]),
        }),
      }),
    )
    expect(update).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 10,
        data: { isMicroSelection: false },
        context: { skipMicroGuard: true },
      }),
    )
  })

  it('does nothing when isMicroSelection is false', async () => {
    await dcsCapturePhotosBeforeChange({
      data: { isMicroSelection: false },
      originalDoc: { id: 1 },
      operation: 'update',
      req: { payload: { find, update } },
    } as never)

    expect(find).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})

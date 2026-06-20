import { describe, expect, it, vi } from 'vitest'

import { withDbRetry } from '@/lib/payload/withDbRetry'

describe('withDbRetry', () => {
  it('retries transient ECONNRESET errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }))
      .mockResolvedValueOnce('ok')

    await expect(withDbRetry(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not retry validation errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('slug must be unique'))

    await expect(withDbRetry(fn)).rejects.toThrow('slug must be unique')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries connection terminated timeout messages', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('Failed query'), {
          cause: new Error('Connection terminated due to connection timeout'),
        }),
      )
      .mockResolvedValueOnce('ok')

    await expect(withDbRetry(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

import { describe, expect, it, vi } from 'vitest'

import { JOB_NAMES } from '@/lib/queue/jobs'
import { ensureBossQueues } from '@/lib/queue/pgboss'

describe('ensureBossQueues', () => {
  it('creates missing pg-boss queues', async () => {
    const createQueue = vi.fn()
    const getQueue = vi.fn().mockResolvedValue(null)

    await ensureBossQueues({ createQueue, getQueue } as never)

    expect(createQueue).toHaveBeenCalledTimes(Object.values(JOB_NAMES).length)
    expect(createQueue).toHaveBeenCalledWith(JOB_NAMES.PROCESS_FIELD_NOTE)
  })

  it('skips queues that already exist', async () => {
    const createQueue = vi.fn()
    const getQueue = vi.fn().mockResolvedValue({ name: 'existing' })

    await ensureBossQueues({ createQueue, getQueue } as never)

    expect(createQueue).not.toHaveBeenCalled()
  })
})

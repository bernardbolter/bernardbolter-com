import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendMock = vi.fn(async () => 'job-id-1')

vi.mock('@/lib/queue/pgboss', () => ({
  getBoss: vi.fn(async () => ({ send: sendMock })),
}))

import { enqueueProcessFieldNote } from '@/lib/queue/enqueue'
import { JOB_NAMES } from '@/lib/queue/jobs'

describe('enqueueProcessFieldNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends process-fieldnote with fieldNoteId', async () => {
    const jobId = await enqueueProcessFieldNote(99)
    expect(jobId).toBe('job-id-1')
    expect(sendMock).toHaveBeenCalledWith(JOB_NAMES.PROCESS_FIELD_NOTE, { fieldNoteId: 99 })
  })
})

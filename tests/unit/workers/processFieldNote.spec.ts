import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Job } from 'pg-boss'
import type { Payload } from 'payload'

import { processFieldNoteJobs } from '@/lib/workers/processFieldNoteLogic'

function job(fieldNoteId: number): Job<{ fieldNoteId: number }> {
  return {
    id: 'job-1',
    name: 'process-fieldnote',
    data: { fieldNoteId },
  } as Job<{ fieldNoteId: number }>
}

describe('processFieldNoteJobs', () => {
  const findByID = vi.fn()
  const update = vi.fn()
  const payload = { findByID, update } as unknown as Payload

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks text field notes complete', async () => {
    findByID.mockResolvedValue({ id: 5, mediaType: 'text' })
    update.mockResolvedValue({})

    await processFieldNoteJobs(payload, [job(5)])

    expect(update).toHaveBeenCalledWith({
      collection: 'field-notes',
      id: 5,
      data: { processingStatus: 'complete' },
      overrideAccess: true,
    })
  })

  it('leaves non-text field notes pending', async () => {
    findByID.mockResolvedValue({ id: 6, mediaType: 'photo' })

    await processFieldNoteJobs(payload, [job(6)])

    expect(update).not.toHaveBeenCalled()
  })
})

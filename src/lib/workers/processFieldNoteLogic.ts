import type { Job } from 'pg-boss'
import type { Payload } from 'payload'

import type { ProcessFieldNotePayload } from '@/lib/queue/jobs'

export async function processFieldNoteJobs(
  payload: Payload,
  jobs: Job<ProcessFieldNotePayload>[],
): Promise<void> {
  for (const job of jobs) {
    const { fieldNoteId } = job.data
    const fieldNote = await payload.findByID({
      collection: 'field-notes',
      id: fieldNoteId,
      depth: 0,
    })

    if (fieldNote.mediaType === 'text') {
      await payload.update({
        collection: 'field-notes',
        id: fieldNoteId,
        data: { processingStatus: 'complete' },
        overrideAccess: true,
      })
      continue
    }

    // REQUIRES HETZNER (Phase E): Whisper, Moondream, FFmpeg for photo/video/voice-memo.
    // Non-text field notes stay pending until the worker runs on Hetzner.
  }
}

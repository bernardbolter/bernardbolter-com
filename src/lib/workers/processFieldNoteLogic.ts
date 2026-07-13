import type { Job } from 'pg-boss'
import type { Payload } from 'payload'

import type { ProcessFieldNotePayload } from '@/lib/queue/jobs'
import { shouldProcessFieldNotesNow } from '@/lib/workers/fieldNoteProcessingWindow'
import { runFieldNotePipeline } from '@/lib/workers/runFieldNotePipeline'
import type { FieldNote } from '@/payload-types'

const PROCESSABLE_STATUSES = new Set<FieldNote['processingStatus']>(['queued', 'pending'])

function buildWritebackData(
  fieldNote: FieldNote,
  pipelineResult: Awaited<ReturnType<typeof runFieldNotePipeline>>,
): Partial<FieldNote> {
  const data: Partial<FieldNote> = {
    processingStatus: 'complete',
  }

  if (pipelineResult.duration != null) data.duration = pipelineResult.duration
  if (pipelineResult.audioTranscript != null) data.audioTranscript = pipelineResult.audioTranscript
  if (pipelineResult.detectedLanguage != null) {
    data.detectedLanguage = pipelineResult.detectedLanguage
  }
  if (pipelineResult.transcriptType != null) data.transcriptType = pipelineResult.transcriptType
  if (pipelineResult.keyframes != null) data.keyframes = pipelineResult.keyframes

  if (pipelineResult.episode != null) data.episode = pipelineResult.episode
  if (pipelineResult.shotType != null) data.shotType = pipelineResult.shotType
  if (pipelineResult.take != null) data.take = pipelineResult.take
  if (pipelineResult.verdict != null) data.verdict = pipelineResult.verdict
  if (pipelineResult.slateParseStatus != null) {
    data.slateParseStatus = pipelineResult.slateParseStatus
  }
  if (pipelineResult.locationName != null && !fieldNote.locationName) {
    data.locationName = pipelineResult.locationName
  }

  return data
}

export async function processSingleFieldNote(
  payload: Payload,
  fieldNoteId: number,
): Promise<'processed' | 'skipped' | 'failed'> {
  if (!shouldProcessFieldNotesNow()) {
    return 'skipped'
  }

  const fieldNote = await payload.findByID({
    collection: 'field-notes',
    id: fieldNoteId,
    depth: 0,
    overrideAccess: true,
  })

  if (fieldNote.mediaType === 'text') {
    if (fieldNote.processingStatus !== 'complete') {
      await payload.update({
        collection: 'field-notes',
        id: fieldNoteId,
        data: { processingStatus: 'complete' },
        overrideAccess: true,
      })
    }
    return 'processed'
  }

  if (!PROCESSABLE_STATUSES.has(fieldNote.processingStatus)) {
    return 'skipped'
  }

  await payload.update({
    collection: 'field-notes',
    id: fieldNoteId,
    data: { processingStatus: 'processing' },
    overrideAccess: true,
  })

  try {
    const pipelineResult = await runFieldNotePipeline(payload, fieldNote)
    await payload.update({
      collection: 'field-notes',
      id: fieldNoteId,
      data: buildWritebackData(fieldNote, pipelineResult),
      overrideAccess: true,
    })
    return 'processed'
  } catch (error) {
    console.error(`[worker] field note ${fieldNoteId} failed`, error)
    await payload.update({
      collection: 'field-notes',
      id: fieldNoteId,
      data: { processingStatus: 'failed' },
      overrideAccess: true,
    })
    return 'failed'
  }
}

export async function processFieldNoteJobs(
  payload: Payload,
  jobs: Job<ProcessFieldNotePayload>[],
): Promise<void> {
  for (const job of jobs) {
    await processSingleFieldNote(payload, job.data.fieldNoteId)
  }
}

export async function pollQueuedFieldNotes(payload: Payload, limit = 5): Promise<number> {
  if (!shouldProcessFieldNotesNow()) {
    return 0
  }

  const { docs } = await payload.find({
    collection: 'field-notes',
    where: {
      processingStatus: { in: ['queued', 'pending'] },
    },
    sort: 'createdAt',
    limit,
    depth: 0,
    overrideAccess: true,
  })

  let processed = 0
  for (const doc of docs) {
    const outcome = await processSingleFieldNote(payload, doc.id)
    if (outcome === 'processed') processed += 1
  }

  return processed
}

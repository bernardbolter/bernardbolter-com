import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Job } from 'pg-boss'
import type { Payload } from 'payload'

vi.mock('@/lib/workers/fieldNoteProcessingWindow', () => ({
  shouldProcessFieldNotesNow: vi.fn(() => true),
}))

vi.mock('@/lib/workers/runFieldNotePipeline', () => ({
  runFieldNotePipeline: vi.fn(),
}))

import { shouldProcessFieldNotesNow } from '@/lib/workers/fieldNoteProcessingWindow'
import { runFieldNotePipeline } from '@/lib/workers/runFieldNotePipeline'
import { processFieldNoteJobs, processSingleFieldNote } from '@/lib/workers/processFieldNoteLogic'

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
  const find = vi.fn()
  const payload = { findByID, update, find } as unknown as Payload

  const shouldProcessMock = vi.mocked(shouldProcessFieldNotesNow)
  const runPipelineMock = vi.mocked(runFieldNotePipeline)

  beforeEach(() => {
    vi.clearAllMocks()
    shouldProcessMock.mockReturnValue(true)
    update.mockResolvedValue({})
    runPipelineMock.mockResolvedValue({
      audioTranscript: 'Slate. Episode one. Talk. Keeper.',
      detectedLanguage: 'en',
      episode: 'e01',
      shotType: 'TALK',
      verdict: 'keeper',
      slateParseStatus: 'parsed',
      duration: 30,
      keyframes: [{ timestamp: 0, imageUrl: 'https://cdn.example/k.jpg', tags: [{ tag: 'talk' }] }],
    })
  })

  it('marks text field notes complete', async () => {
    findByID.mockResolvedValue({ id: 5, mediaType: 'text', processingStatus: 'pending' })

    await processFieldNoteJobs(payload, [job(5)])

    expect(update).toHaveBeenCalledWith({
      collection: 'field-notes',
      id: 5,
      data: { processingStatus: 'complete' },
      overrideAccess: true,
    })
    expect(runPipelineMock).not.toHaveBeenCalled()
  })

  it('runs the full pipeline for queued video field notes', async () => {
    findByID.mockResolvedValue({
      id: 6,
      mediaType: 'video-performance',
      processingStatus: 'queued',
      mediaFile: 88,
    })

    await processFieldNoteJobs(payload, [job(6)])

    expect(runPipelineMock).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledWith({
      collection: 'field-notes',
      id: 6,
      data: { processingStatus: 'processing' },
      overrideAccess: true,
    })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'field-notes',
        id: 6,
        data: expect.objectContaining({
          processingStatus: 'complete',
          episode: 'e01',
          shotType: 'TALK',
          verdict: 'keeper',
        }),
      }),
    )
  })

  it('skips processing outside the overnight window', async () => {
    shouldProcessMock.mockReturnValue(false)

    const outcome = await processSingleFieldNote(payload, 6)

    expect(outcome).toBe('skipped')
    expect(findByID).not.toHaveBeenCalled()
  })

  it('marks failed when pipeline throws', async () => {
    findByID.mockResolvedValue({
      id: 7,
      mediaType: 'photo',
      processingStatus: 'pending',
      mediaFile: 1,
    })
    runPipelineMock.mockRejectedValue(new Error('moondream down'))

    const outcome = await processSingleFieldNote(payload, 7)

    expect(outcome).toBe('failed')
    expect(update).toHaveBeenCalledWith({
      collection: 'field-notes',
      id: 7,
      data: { processingStatus: 'failed' },
      overrideAccess: true,
    })
  })
})

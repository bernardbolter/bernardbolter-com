import { describe, expect, it } from 'vitest'

import { buildFieldNoteCreateData } from '@/lib/studio/applyCapturePreset'
import type { CapturePreset } from '@/payload-types'

const testPreset: CapturePreset = {
  id: 7,
  name: 'Rap Critic test',
  mediaType: 'video-performance',
  pipelineSteps: ['keyframes', 'moondream', 'whisper', 'slateParse'],
  defaultEpisode: 'e01',
  defaultLocationName: 'Neptunbrunnen',
  transcriptLabel: 'speech',
  keyframeIntervalSec: 10,
  updatedAt: '2026-07-14T00:00:00.000Z',
  createdAt: '2026-07-14T00:00:00.000Z',
}

describe('buildFieldNoteCreateData', () => {
  it('sets queued status and preset defaults for media uploads', () => {
    const data = buildFieldNoteCreateData({
      mediaType: 'video-performance',
      mediaFileId: 99,
      capturePreset: testPreset,
      capturePresetId: 7,
    })

    expect(data.processingStatus).toBe('queued')
    expect(data.capturePreset).toBe(7)
    expect(data.episode).toBe('e01')
    expect(data.locationName).toBe('Neptunbrunnen')
    expect(data.transcriptType).toBe('speech')
    expect(data.mediaFile).toBe(99)
  })

  it('keeps pending status without a preset', () => {
    const data = buildFieldNoteCreateData({
      mediaType: 'photo',
      mediaFileId: 12,
    })

    expect(data.processingStatus).toBe('pending')
    expect(data.capturePreset).toBeUndefined()
    expect(data.episode).toBeUndefined()
  })

  it('prefers explicit locationName over preset default', () => {
    const data = buildFieldNoteCreateData({
      mediaType: 'video-performance',
      mediaFileId: 1,
      locationName: 'Alexanderplatz',
      capturePreset: testPreset,
      capturePresetId: 7,
    })

    expect(data.locationName).toBe('Alexanderplatz')
  })
})

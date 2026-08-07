import { describe, expect, it } from 'vitest'

import {
  defaultPipelineStepsForMediaType,
  defaultTranscriptTypeForMediaType,
} from '@/lib/workers/runFieldNotePipeline'
import type { CapturePresetPipelineStep } from '@/lib/workers/fieldNotePipelineConstants'

function stepEnabled(steps: CapturePresetPipelineStep[], step: CapturePresetPipelineStep): boolean {
  return steps.includes(step)
}

describe('runFieldNotePipeline defaults', () => {
  it('maps media types to default pipeline steps', () => {
    expect(defaultPipelineStepsForMediaType('photo')).toEqual(['moondream'])
    expect(defaultPipelineStepsForMediaType('voice-memo')).toEqual(['whisper'])
    expect(defaultPipelineStepsForMediaType('text')).toEqual([])
    expect(defaultPipelineStepsForMediaType('video-performance')).toEqual([
      'keyframes',
      'whisper',
      'slateParse',
      'moondream',
    ])
  })

  it('maps media types to transcript labels', () => {
    expect(defaultTranscriptTypeForMediaType('video-broll')).toBe('shooter-description')
    expect(defaultTranscriptTypeForMediaType('video-performance')).toBe('speech')
    expect(defaultTranscriptTypeForMediaType('voice-memo')).toBe('speech')
    expect(defaultTranscriptTypeForMediaType('photo')).toBe('none')
  })

  it('Rap Critic TikTok preset is whisper-only (no keyframes/moondream/slate)', () => {
    const steps: CapturePresetPipelineStep[] = ['whisper']
    expect(stepEnabled(steps, 'whisper')).toBe(true)
    expect(stepEnabled(steps, 'keyframes')).toBe(false)
    expect(stepEnabled(steps, 'moondream')).toBe(false)
    expect(stepEnabled(steps, 'slateParse')).toBe(false)
  })
})

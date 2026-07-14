import fs from 'node:fs/promises'

import type { Payload } from 'payload'

import { downloadMediaFileToScratch } from '@/lib/workers/downloadFieldNoteMedia'
import { extractAudioOnly, extractKeyframesAndAudio } from '@/lib/workers/ffmpeg'
import {
  createFieldNoteScratchDir,
  removeScratchDir,
} from '@/lib/workers/fieldNoteScratch'
import type { CapturePresetPipelineStep } from '@/lib/workers/fieldNotePipelineConstants'
import { getMoondreamPrompt } from '@/lib/workers/moondreamPrompts'
import { queryMoondreamImage } from '@/lib/workers/moondream'
import { parseSlateFromTranscript } from '@/lib/workers/parseSlate'
import { transcribeAudioFile } from '@/lib/workers/whisper'
import {
  getPublicUrlForObjectKey,
  putBufferToR2,
} from '@/lib/studio/r2'
import type { CapturePreset, FieldNote } from '@/payload-types'

const DEFAULT_KEYFRAME_INTERVAL_SEC = 10

export type ProcessedKeyframe = {
  timestamp: number
  imageUrl: string
  tags: { tag: string }[]
}

export type FieldNotePipelineResult = {
  duration?: number
  audioTranscript?: string
  detectedLanguage?: string
  transcriptType?: FieldNote['transcriptType']
  keyframes?: ProcessedKeyframe[]
  episode?: string | null
  shotType?: FieldNote['shotType']
  take?: number | null
  verdict?: FieldNote['verdict']
  slateParseStatus?: FieldNote['slateParseStatus']
  locationName?: string | null
}

function isVideoMediaType(mediaType: FieldNote['mediaType']): boolean {
  return mediaType.startsWith('video-')
}

export function defaultPipelineStepsForMediaType(
  mediaType: FieldNote['mediaType'],
): CapturePresetPipelineStep[] {
  switch (mediaType) {
    case 'photo':
      return ['moondream']
    case 'voice-memo':
      return ['whisper']
    case 'text':
      return []
    default:
      if (isVideoMediaType(mediaType)) {
        return ['keyframes', 'whisper', 'slateParse', 'moondream']
      }
      return []
  }
}

export function defaultTranscriptTypeForMediaType(
  mediaType: FieldNote['mediaType'],
): FieldNote['transcriptType'] {
  if (mediaType === 'video-broll') return 'shooter-description'
  if (mediaType === 'voice-memo' || isVideoMediaType(mediaType)) return 'speech'
  return 'none'
}

function resolvePipelineSteps(
  fieldNote: FieldNote,
  preset: CapturePreset | null,
): CapturePresetPipelineStep[] {
  if (preset?.pipelineSteps?.length) {
    return preset.pipelineSteps
  }
  return defaultPipelineStepsForMediaType(fieldNote.mediaType)
}

function resolveKeyframeIntervalSec(preset: CapturePreset | null): number {
  const interval = preset?.keyframeIntervalSec
  if (interval != null && interval > 0) return interval
  return DEFAULT_KEYFRAME_INTERVAL_SEC
}

function stepEnabled(steps: CapturePresetPipelineStep[], step: CapturePresetPipelineStep): boolean {
  return steps.includes(step)
}

async function uploadKeyframeJpeg(
  fieldNoteId: number,
  timestamp: number,
  localPath: string,
): Promise<string> {
  const body = await fs.readFile(localPath)
  const objectKey = `field-notes/${fieldNoteId}/keyframes/${timestamp}.jpg`
  await putBufferToR2(objectKey, body, 'image/jpeg')
  return getPublicUrlForObjectKey(objectKey)
}

async function loadCapturePreset(
  payload: Payload,
  fieldNote: FieldNote,
): Promise<CapturePreset | null> {
  const presetId =
    typeof fieldNote.capturePreset === 'number'
      ? fieldNote.capturePreset
      : fieldNote.capturePreset?.id

  if (presetId == null) return null

  try {
    return await payload.findByID({
      collection: 'capture-presets',
      id: presetId,
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    return null
  }
}

async function tagImageAtPath(
  imagePath: string,
  promptInput: Parameters<typeof getMoondreamPrompt>[0],
): Promise<{ tag: string }[]> {
  const prompt = getMoondreamPrompt(promptInput)
  const { tags } = await queryMoondreamImage(imagePath, prompt)
  return tags.map((tag) => ({ tag }))
}

/**
 * Run ffmpeg → Whisper → slate parse → Moondream for one FieldNote.
 * Caller handles processingStatus transitions and window gating.
 */
export async function runFieldNotePipeline(
  payload: Payload,
  fieldNote: FieldNote,
): Promise<FieldNotePipelineResult> {
  if (fieldNote.mediaType === 'text') {
    return {}
  }

  const preset = await loadCapturePreset(payload, fieldNote)
  const steps = resolvePipelineSteps(fieldNote, preset)
  const scratchDir = await createFieldNoteScratchDir(fieldNote.id)

  const result: FieldNotePipelineResult = {
    transcriptType:
      fieldNote.transcriptType ??
      preset?.transcriptLabel ??
      defaultTranscriptTypeForMediaType(fieldNote.mediaType),
  }

  let slateContext: {
    shotType?: string | null
    slateParseStatus?: string | null
    mediaType?: FieldNote['mediaType']
  } = {
    shotType: fieldNote.shotType,
    slateParseStatus: fieldNote.slateParseStatus,
    mediaType: fieldNote.mediaType,
  }

  try {
    const mediaFileId =
      typeof fieldNote.mediaFile === 'number' ? fieldNote.mediaFile : fieldNote.mediaFile?.id

    if (mediaFileId == null) {
      throw new Error(`Field note ${fieldNote.id} has no mediaFile`)
    }

    if (fieldNote.mediaType === 'photo') {
      if (!stepEnabled(steps, 'moondream')) {
        return result
      }

      const localPath = await downloadMediaFileToScratch(payload, mediaFileId, scratchDir)
      const media = await payload.findByID({
        collection: 'media',
        id: mediaFileId,
        depth: 0,
        overrideAccess: true,
      })
      if (!media.url) {
        throw new Error(`Media ${mediaFileId} has no url for photo tagging`)
      }
      const tags = await tagImageAtPath(localPath, {
        mediaType: 'photo',
        shotType: fieldNote.shotType,
        slateParseStatus: fieldNote.slateParseStatus,
      })

      result.keyframes = [{ timestamp: 0, imageUrl: media.url, tags }]
      return result
    }

    const localMediaPath = await downloadMediaFileToScratch(payload, mediaFileId, scratchDir)
    let audioPath: string | null = null
    let extractedKeyframes: { timestamp: number; path: string }[] = []

    if (isVideoMediaType(fieldNote.mediaType)) {
      if (stepEnabled(steps, 'keyframes') || stepEnabled(steps, 'whisper')) {
        const extract = await extractKeyframesAndAudio(localMediaPath, {
          intervalSec: resolveKeyframeIntervalSec(preset),
          workDir: scratchDir,
        })
        extractedKeyframes = extract.keyframes
        audioPath = extract.audioPath
        result.duration = Math.round(extract.durationSec)
      }
    } else if (fieldNote.mediaType === 'voice-memo') {
      if (stepEnabled(steps, 'whisper')) {
        const extract = await extractAudioOnly(localMediaPath, scratchDir)
        audioPath = extract.audioPath
        result.duration = Math.round(extract.durationSec)
      }
    }

    if (audioPath && stepEnabled(steps, 'whisper')) {
      try {
        await fs.access(audioPath)
        const transcription = await transcribeAudioFile(audioPath)
        result.audioTranscript = transcription.text
        result.detectedLanguage = transcription.language
      } catch (error) {
        if (!(error instanceof Error && error.message.includes('ENOENT'))) {
          throw error
        }
      }
    }

    if (stepEnabled(steps, 'slateParse') && result.audioTranscript?.trim()) {
      const slate = parseSlateFromTranscript(result.audioTranscript)
      result.episode = slate.episode
      result.shotType = slate.shotType
      result.take = slate.take
      result.verdict = slate.verdict
      result.slateParseStatus = slate.slateParseStatus
      if (slate.locationName && !fieldNote.locationName) {
        result.locationName = slate.locationName
      }

      slateContext = {
        shotType: slate.shotType,
        slateParseStatus: slate.slateParseStatus,
        mediaType: fieldNote.mediaType,
      }
    }

    if (stepEnabled(steps, 'moondream')) {
      const processedKeyframes: ProcessedKeyframe[] = []

      if (extractedKeyframes.length > 0) {
        for (const frame of extractedKeyframes) {
          const tags = await tagImageAtPath(frame.path, slateContext)
          const imageUrl = await uploadKeyframeJpeg(fieldNote.id, frame.timestamp, frame.path)
          processedKeyframes.push({ timestamp: frame.timestamp, imageUrl, tags })
        }
      }

      if (processedKeyframes.length > 0) {
        result.keyframes = processedKeyframes
      }
    } else if (extractedKeyframes.length > 0) {
      result.keyframes = await Promise.all(
        extractedKeyframes.map(async (frame) => ({
          timestamp: frame.timestamp,
          imageUrl: await uploadKeyframeJpeg(fieldNote.id, frame.timestamp, frame.path),
          tags: [],
        })),
      )
    }

    return result
  } finally {
    await removeScratchDir(scratchDir)
  }
}

import type { Payload } from 'payload'

import type { CreateFieldNoteInput } from '@/lib/studio/fieldNoteSchema'
import type { CapturePreset, FieldNote } from '@/payload-types'

type BuildFieldNoteDataInput = CreateFieldNoteInput & {
  capturePreset?: CapturePreset | null
}

export type FieldNoteCreateData = Omit<
  Partial<FieldNote>,
  'id' | 'createdAt' | 'updatedAt'
> & {
  mediaType: FieldNote['mediaType']
  processingStatus: FieldNote['processingStatus']
  recordOrigin: FieldNote['recordOrigin']
}

export async function loadCapturePreset(
  payload: Payload,
  capturePresetId: number | undefined,
  user: Parameters<Payload['findByID']>[0]['user'],
): Promise<CapturePreset | null> {
  if (capturePresetId == null) return null

  try {
    return await payload.findByID({
      collection: 'capture-presets',
      id: capturePresetId,
      depth: 0,
      overrideAccess: false,
      user,
    })
  } catch {
    return null
  }
}

/** Merge upload input with optional CapturePreset defaults. */
export function buildFieldNoteCreateData(input: BuildFieldNoteDataInput): FieldNoteCreateData {
  const preset = input.capturePreset
  const usesPreset = preset != null

  const data: FieldNoteCreateData = {
    mediaType: preset?.mediaType ?? input.mediaType,
    mediaFile: input.mediaFileId,
    writtenNote: input.writtenNote,
    city: input.city,
    locationName: input.locationName ?? preset?.defaultLocationName ?? undefined,
    location: input.location,
    capturedAt: input.capturedAt,
    relatedArtwork: input.relatedArtwork,
    relatedEpisode: input.relatedEpisode,
    lines: input.lines,
    register: input.register,
    processStage: input.processStage,
    conceptualThread: input.conceptualThread,
    capturePreset: preset?.id,
    episode: preset?.defaultEpisode ?? undefined,
    processingStatus: usesPreset && input.mediaType !== 'text' ? 'queued' : 'pending',
    recordOrigin: 'user',
  }

  if (preset?.transcriptLabel) {
    data.transcriptType = preset.transcriptLabel
  }

  return data
}

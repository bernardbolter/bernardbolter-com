import { requireStudio } from '@/lib/studio/requireStudio'
import { buildFieldNoteCreateData, loadCapturePreset } from '@/lib/studio/applyCapturePreset'
import { createFieldNoteSchema } from '@/lib/studio/fieldNoteSchema'
import { queueProcessFieldNote } from '@/lib/studio/queueProcessFieldNote'

export async function POST(request: Request) {
  const { ok, payload, user } = await requireStudio()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createFieldNoteSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  const data = parsed.data
  const isBeatTrack = data.cameraAngle === 'beat'

  // Instrumental beat for VERSE — store with the take, skip Whisper/ffmpeg pipeline.
  if (isBeatTrack) {
    if (data.mediaType !== 'voice-memo') {
      return Response.json(
        { error: 'Beat track must use mediaType voice-memo' },
        { status: 400 },
      )
    }
    if (data.capturePresetId != null) {
      return Response.json(
        { error: 'Beat track cannot use a capture preset' },
        { status: 400 },
      )
    }
  }

  const capturePreset =
    data.capturePresetId != null
      ? await loadCapturePreset(payload, data.capturePresetId, user)
      : null

  if (data.capturePresetId != null && !capturePreset) {
    return Response.json({ error: 'Capture preset not found' }, { status: 404 })
  }

  if (capturePreset && capturePreset.mediaType !== data.mediaType) {
    return Response.json(
      { error: `mediaType must match preset (${capturePreset.mediaType})` },
      { status: 400 },
    )
  }

  try {
    const createData = buildFieldNoteCreateData({
      ...data,
      capturePreset: isBeatTrack ? null : capturePreset,
    })
    if (isBeatTrack) {
      createData.processingStatus = 'complete'
      createData.transcriptType = 'none'
    }

    const fieldNote = await payload.create({
      collection: 'field-notes',
      data: createData,
      overrideAccess: false,
      user,
    })

    let queueError: string | undefined
    if (!isBeatTrack) {
      try {
        await queueProcessFieldNote(fieldNote.id)
      } catch (error) {
        queueError =
          error instanceof Error ? error.message : 'Failed to enqueue processing job'
        console.error(`[studio] field note ${fieldNote.id} created but queue failed`, error)
      }
    }

    return Response.json({
      id: fieldNote.id,
      processingStatus: fieldNote.processingStatus,
      ...(queueError ? { queueWarning: queueError } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create field note'
    return Response.json({ error: message }, { status: 500 })
  }
}

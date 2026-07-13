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
    const fieldNote = await payload.create({
      collection: 'field-notes',
      data: buildFieldNoteCreateData({
        ...data,
        capturePreset,
      }),
      overrideAccess: false,
      user,
    })

    await queueProcessFieldNote(fieldNote.id)

    return Response.json({
      id: fieldNote.id,
      processingStatus: fieldNote.processingStatus,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create field note'
    return Response.json({ error: message }, { status: 500 })
  }
}

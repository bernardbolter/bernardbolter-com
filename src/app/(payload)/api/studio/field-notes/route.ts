import { requireStudio } from '@/lib/studio/requireStudio'
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

  try {
    const fieldNote = await payload.create({
      collection: 'field-notes',
      data: {
        mediaType: data.mediaType,
        mediaFile: data.mediaFileId,
        writtenNote: data.writtenNote,
        city: data.city,
        locationName: data.locationName,
        location: data.location,
        capturedAt: data.capturedAt,
        relatedArtwork: data.relatedArtwork,
        relatedEpisode: data.relatedEpisode,
        lines: data.lines,
        register: data.register,
        processStage: data.processStage,
        conceptualThread: data.conceptualThread,
        processingStatus: 'pending',
        recordOrigin: 'user',
      },
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

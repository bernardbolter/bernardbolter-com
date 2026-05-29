import { z } from 'zod'

import {
  fieldNoteConceptualThreads,
  fieldNoteProcessStages,
  fieldNoteRegisters,
} from '@/lib/studio/fieldNoteSchema'
import { getFieldNote, updateFieldNote } from '@/lib/studio/fieldNotes'
import { requireStudio } from '@/lib/studio/requireStudio'

const patchSchema = z.object({
  writtenNote: z.string().optional(),
  relatedArtwork: z.number().int().positive().nullable().optional(),
  relatedEpisode: z.number().int().positive().nullable().optional(),
  lines: z.array(z.number().int().positive()).optional(),
  register: z.enum(fieldNoteRegisters).nullable().optional(),
  processStage: z.enum(fieldNoteProcessStages).nullable().optional(),
  conceptualThread: z.enum(fieldNoteConceptualThreads).nullable().optional(),
  confirmLineId: z.number().int().positive().optional(),
  dismissLineId: z.number().int().positive().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const { ok, payload, user } = await requireStudio()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const noteId = Number((await context.params).id)
  if (!Number.isFinite(noteId)) {
    return Response.json({ error: 'Invalid id' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  try {
    const existing = await getFieldNote(payload, user, noteId)
    let lines = parsed.data.lines
    let suggestedLines = existing.suggestedLines ?? []

    if (parsed.data.confirmLineId) {
      const suggestion = suggestedLines?.find((s) => s.lineId === parsed.data.confirmLineId)
      const current = Array.isArray(existing.lines)
        ? existing.lines.map((l) => (typeof l === 'object' ? l.id : l))
        : []
      if (suggestion && !current.includes(suggestion.lineId)) {
        lines = [...current, suggestion.lineId]
      }
      suggestedLines = (suggestedLines ?? []).filter(
        (s) => s.lineId !== parsed.data.confirmLineId,
      )
    }

    if (parsed.data.dismissLineId) {
      suggestedLines = (suggestedLines ?? []).filter(
        (s) => s.lineId !== parsed.data.dismissLineId,
      )
    }

    const updated = await updateFieldNote(payload, user, noteId, {
      writtenNote: parsed.data.writtenNote,
      relatedArtwork: parsed.data.relatedArtwork,
      relatedEpisode: parsed.data.relatedEpisode,
      lines,
      register: parsed.data.register ?? undefined,
      processStage: parsed.data.processStage ?? undefined,
      conceptualThread: parsed.data.conceptualThread ?? undefined,
      suggestedLines,
    })

    return Response.json({ id: updated.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

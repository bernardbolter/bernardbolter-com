import { requireStudio } from '@/lib/studio/requireStudio'
import { buildEdlFromAssembly, type AssemblyEdlRow } from '@/lib/studio/edlExport'
import type { FieldNote, Media } from '@/payload-types'

function mediaFilename(note: FieldNote): string | null {
  const media = note.mediaFile
  if (!media || typeof media === 'number') return null
  const filename = (media as Media).filename
  return typeof filename === 'string' && filename.trim() ? filename : null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { ok, payload, user } = await requireStudio()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: idRaw } = await context.params
  const id = Number.parseInt(idRaw, 10)
  if (!Number.isFinite(id) || id < 1) {
    return Response.json({ error: 'Invalid episode id' }, { status: 400 })
  }

  const episode = await payload.findByID({
    collection: 'episodes',
    id,
    depth: 0,
    overrideAccess: false,
    user,
  })

  const assembly = episode.assembly ?? []
  const clipIds = [
    ...new Set(
      assembly
        .map((row) => row.clipFieldNoteId)
        .filter((n): n is number => typeof n === 'number' && n > 0),
    ),
  ]

  if (clipIds.length === 0) {
    return Response.json(
      { error: 'No assembly clips to export. Map beats to clips in the assembly chat first.' },
      { status: 400 },
    )
  }

  const notes = await payload.find({
    collection: 'field-notes',
    where: { id: { in: clipIds } },
    limit: Math.max(clipIds.length, 1),
    depth: 1,
    overrideAccess: false,
    user,
  })

  const byId = new Map(notes.docs.map((note) => [note.id, note]))
  const rows: AssemblyEdlRow[] = []

  for (const row of assembly) {
    const fieldNoteId = row.clipFieldNoteId
    if (typeof fieldNoteId !== 'number' || fieldNoteId < 1) continue
    const note = byId.get(fieldNoteId)
    if (!note) continue

    rows.push({
      beatName: row.beatName,
      notes: row.notes,
      fieldNoteId,
      durationSec: typeof note.duration === 'number' ? note.duration : null,
      mediaFilename: mediaFilename(note),
      shotType: note.shotType ?? null,
      cameraAngle: note.cameraAngle ?? null,
    })
  }

  if (rows.length === 0) {
    return Response.json(
      { error: 'Assembly clip ids could not be resolved to FieldNotes with media.' },
      { status: 400 },
    )
  }

  const edl = buildEdlFromAssembly(episode.title, rows)
  const safeTitle = episode.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const filename = `${safeTitle || `episode-${id}`}-assembly.edl`

  return new Response(edl, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

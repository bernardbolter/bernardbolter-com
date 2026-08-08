import { z } from 'zod'

import { requireStudio } from '@/lib/studio/requireStudio'
import type { Episode } from '@/payload-types'

const MAX_BEAT_TRACKS = 3

const patchSchema = z.object({
  /** Append one beat (rejected if episode already has 3). */
  addBeatTrackId: z.number().int().positive().optional(),
  /** Optional label for the appended beat. */
  addBeatTrackLabel: z.string().max(120).optional(),
  /** Replace the full list (max 3). */
  beatTrackIds: z.array(z.number().int().positive()).max(MAX_BEAT_TRACKS).optional(),
  coverPhotoId: z.number().int().positive().nullable().optional(),
  description: z.string().optional(),
  locationName: z.string().optional(),
  concept: z.string().optional(),
})

function mediaId(value: number | { id: number } | null | undefined): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && typeof value.id === 'number') return value.id
  return null
}

function existingBeatRows(episode: Episode): { track: number; label?: string }[] {
  const rows: { track: number; label?: string }[] = []
  for (const row of episode.beatTracks ?? []) {
    const id = mediaId(row.track as number | { id: number } | null)
    if (id == null) continue
    rows.push({
      track: id,
      ...(row.label?.trim() ? { label: row.label.trim() } : {}),
    })
  }
  return rows
}

export async function PATCH(
  request: Request,
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

  const data: Record<string, unknown> = {}
  if (parsed.data.coverPhotoId !== undefined) data.coverPhoto = parsed.data.coverPhotoId
  if (parsed.data.description !== undefined) data.description = parsed.data.description
  if (parsed.data.locationName !== undefined) data.locationName = parsed.data.locationName
  if (parsed.data.concept !== undefined) data.concept = parsed.data.concept

  if (parsed.data.beatTrackIds !== undefined || parsed.data.addBeatTrackId !== undefined) {
    let current: Episode
    try {
      current = await payload.findByID({
        collection: 'episodes',
        id,
        depth: 0,
        overrideAccess: false,
        user,
      })
    } catch {
      return Response.json({ error: 'Episode not found' }, { status: 404 })
    }

    if (parsed.data.beatTrackIds !== undefined) {
      data.beatTracks = parsed.data.beatTrackIds.map((trackId) => ({ track: trackId }))
    } else if (parsed.data.addBeatTrackId != null) {
      const rows = existingBeatRows(current)
      if (rows.length >= MAX_BEAT_TRACKS) {
        return Response.json(
          { error: `Episode already has ${MAX_BEAT_TRACKS} beat tracks` },
          { status: 400 },
        )
      }
      const label = parsed.data.addBeatTrackLabel?.trim()
      rows.push({
        track: parsed.data.addBeatTrackId,
        ...(label ? { label } : {}),
      })
      data.beatTracks = rows
    }
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const episode = await payload.update({
      collection: 'episodes',
      id,
      data,
      depth: 1,
      overrideAccess: false,
      user,
    })
    return Response.json({
      id: episode.id,
      beatTracks: episode.beatTracks,
      beatTrackCount: episode.beatTracks?.length ?? 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update episode'
    return Response.json({ error: message }, { status: 500 })
  }
}

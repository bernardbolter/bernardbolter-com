import { randomUUID } from 'crypto'
import { z } from 'zod'

import { getDefaultArtistId } from '@/lib/studio/defaults'
import { requireStudio } from '@/lib/studio/requireStudio'

const bodySchema = z.object({
  sessionType: z.enum(['episode-storyboard', 'episode-assembly']),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { ok, payload, user } = await requireStudio()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const episodeId = Number((await context.params).id)
  if (!Number.isFinite(episodeId)) {
    return Response.json({ error: 'Invalid episode id' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  try {
    await payload.findByID({
      collection: 'episodes',
      id: episodeId,
      depth: 0,
      overrideAccess: false,
      user,
    })
  } catch {
    return Response.json({ error: 'Episode not found' }, { status: 404 })
  }

  const artistId = await getDefaultArtistId(payload, user)

  const session = await payload.create({
    collection: 'sessions',
    data: {
      sessionId: randomUUID(),
      sessionType: parsed.data.sessionType,
      status: 'in-progress',
      artistId,
      episodeRecord: episodeId,
      messages: [],
    },
    overrideAccess: false,
    user,
  })

  return Response.json({
    id: session.id,
    sessionId: session.sessionId,
    sessionType: session.sessionType,
  })
}

import { z } from 'zod'

import { requireStaff } from '@/lib/artOfficial/requireStaff'
const createSessionSchema = z.object({
  sessionType: z.enum([
    'artwork-cataloguing',
    'triptych-cataloguing',
    'connected-reading',
    'artist-statement',
    'biography',
    'onboarding',
    'annual-snapshot',
    'sequencing',
    'episode-storyboard',
    'episode-assembly',
    'event-enrichment',
  ]),
  artworkRecord: z.number().int().positive().optional(),
  primaryArtwork: z.number().int().positive().optional(),
  triptychRecord: z.number().int().positive().optional(),
  sequencingSeries: z.number().int().positive().optional(),
  eventRecord: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createSessionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  const artists = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })

  const artist = artists.docs[0]
  if (!artist) {
    return Response.json(
      { error: 'Artist singleton not found. Create the Artist record first.' },
      { status: 412 },
    )
  }

  const artworkId = parsed.data.primaryArtwork ?? parsed.data.artworkRecord

  const session = await payload.create({
    collection: 'sessions',
    data: {
      sessionType: parsed.data.sessionType,
      artistId: artist.id,
      artworkRecord: artworkId,
      primaryArtwork: artworkId,
      triptychRecord: parsed.data.triptychRecord,
      sequencingSeries: parsed.data.sequencingSeries,
      eventRecord: parsed.data.eventRecord,
      status: 'in-progress',
      messages: [],
      ...(parsed.data.sessionType === 'event-enrichment'
        ? { eventDialoguePhase: 'phase-a-research' as const }
        : {}),
      // Pre-upload questionnaire only runs for new artworks — skip when refining an existing one.
      ...(parsed.data.sessionType === 'artwork-cataloguing'
        ? {
            currentPhase: artworkId ? 'identity' : 'pre-upload',
            ...(!artworkId ? { preUploadStep: 1 } : {}),
          }
        : {}),
    },
    overrideAccess: false,
    user,
  })

  return Response.json({
    id: session.id,
    sessionId: session.sessionId,
    sessionType: session.sessionType,
    status: session.status,
    artworkRecord: session.artworkRecord ?? null,
  })
}

export async function GET(request: Request) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status') ?? 'in-progress'
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100)

  const result = await payload.find({
    collection: 'sessions',
    where: { status: { equals: status } },
    sort: '-updatedAt',
    limit,
    depth: 0,
    overrideAccess: false,
    user,
  })

  return Response.json({
    docs: result.docs.map((s) => ({
      id: s.id,
      sessionId: s.sessionId,
      sessionType: s.sessionType,
      status: s.status,
      artworkRecord: s.artworkRecord,
      dialogueRefinementFlag: s.dialogueRefinementFlag,
      updatedAt: s.updatedAt,
    })),
  })
}

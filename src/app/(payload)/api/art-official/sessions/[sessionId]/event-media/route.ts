import {
  normalizeStagedEventMedia,
  seedStagedEventMediaFromEvent,
  type StagedEventMedia,
} from '@/lib/artOfficial/stagedEventMedia'
import { searchArtworksForStaff } from '@/lib/artOfficial/searchArtworksForStaff'
import { requireStaff } from '@/lib/artOfficial/requireStaff'

type RouteContext = { params: Promise<{ sessionId: string }> }

async function loadSession(sessionId: string, payload: Awaited<ReturnType<typeof requireStaff>>['payload'], user: NonNullable<Awaited<ReturnType<typeof requireStaff>>['user']>) {
  const result = await payload.find({
    collection: 'sessions',
    where: { sessionId: { equals: sessionId } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  return result.docs[0] ?? null
}

export async function GET(_request: Request, context: RouteContext) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await context.params
  const session = await loadSession(sessionId, payload, user)
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 })
  }
  if (session.sessionType !== 'event-enrichment') {
    return Response.json({ error: 'Not an event enrichment session' }, { status: 412 })
  }

  const eventId =
    typeof session.eventRecord === 'number' ? session.eventRecord : session.eventRecord?.id
  if (!eventId) {
    return Response.json({ error: 'Session is not linked to an event' }, { status: 412 })
  }

  const event = await payload.findByID({
    collection: 'events',
    id: eventId,
    depth: 1,
    overrideAccess: false,
    user,
  })

  const staged = seedStagedEventMediaFromEvent(event, session.stagedEventMedia)

  const artworks = staged.artworkIds.length
    ? (
        await Promise.all(
          staged.artworkIds.map((id) =>
            searchArtworksForStaff({ payload, user, artworkId: id, limit: 1 }),
          ),
        )
      ).flat()
    : []

  return Response.json({
    eventId,
    eventTitle: event.title,
    staged,
    artworks,
  })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await context.params
  const session = await loadSession(sessionId, payload, user)
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 })
  }
  if (session.sessionType !== 'event-enrichment') {
    return Response.json({ error: 'Not an event enrichment session' }, { status: 412 })
  }

  const body = (await request.json().catch(() => null)) as StagedEventMedia | null
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const staged = normalizeStagedEventMedia(body)

  await payload.update({
    collection: 'sessions',
    id: session.id,
    data: { stagedEventMedia: staged },
    overrideAccess: false,
    user,
    context: { skipAgent: true },
  })

  return Response.json({ staged })
}

import { commitTarget } from '@/lib/artOfficial/routing'
import { requireStaff } from '@/lib/artOfficial/requireStaff'
import type { SessionType } from '@/lib/artOfficial/routing'

type RouteContext = { params: Promise<{ sessionId: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await context.params

  const sessionRes = await payload.find({
    collection: 'sessions',
    where: { sessionId: { equals: sessionId } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })

  const session = sessionRes.docs[0]
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const target = commitTarget(session.sessionType as SessionType)
  const weakCount = Array.isArray(session.weakPhases) ? session.weakPhases.length : 0
  const refinementFlagged = weakCount > 1

  let artworkId: number | undefined

  switch (target.kind) {
    case 'create-artwork': {
      const artworkData = {
        ...(body.artworkData ?? {}),
        status: 'draft' as const,
      }
      const existingId =
        body.artworkId ??
        (typeof session.artworkRecord === 'object'
          ? session.artworkRecord?.id
          : session.artworkRecord)

      if (existingId) {
        const updated = await payload.update({
          collection: 'artworks',
          id: existingId,
          data: artworkData,
          overrideAccess: false,
          user,
        })
        artworkId = updated.id
      } else {
        const created = await payload.create({
          collection: 'artworks',
          data: artworkData,
          overrideAccess: false,
          user,
        })
        artworkId = created.id
      }
      break
    }

    case 'update-artist-singleton': {
      const artists = await payload.find({
        collection: 'artists',
        limit: 1,
        depth: 0,
        overrideAccess: false,
        user,
      })
      const artist = artists.docs[0]
      if (!artist) {
        return Response.json({ error: 'Artist singleton not found' }, { status: 412 })
      }
      await payload.update({
        collection: 'artists',
        id: artist.id,
        data: body.artistPatch ?? {},
        overrideAccess: false,
        user,
        locale: 'en',
      })
      break
    }

    case 'no-record-write': {
      const patches = body.practiceKnowledgePatches as
        | Array<{ slug: string; content: unknown }>
        | undefined
      if (patches?.length) {
        for (const patch of patches) {
          const found = await payload.find({
            collection: 'practice-knowledge',
            where: { slug: { equals: patch.slug } },
            limit: 1,
            depth: 0,
            overrideAccess: false,
            user,
          })
          const doc = found.docs[0]
          if (doc && patch.content) {
            await payload.update({
              collection: 'practice-knowledge',
              id: doc.id,
              data: {
                content: patch.content as Record<string, unknown>,
              },
              overrideAccess: false,
              user,
              locale: 'en',
            })
          }
        }
      }
      break
    }
  }

  await payload.update({
    collection: 'sessions',
    id: session.id,
    data: {
      status: 'completed',
      completedAt: new Date().toISOString(),
      dialogueRefinementFlag: refinementFlagged,
      artworkRecord: artworkId ?? session.artworkRecord,
      ...(body.firstImpression ? { firstImpression: body.firstImpression } : {}),
      ...(body.secondDescription ? { secondDescription: body.secondDescription } : {}),
      ...(body.refinementNotes ? { refinementNotes: body.refinementNotes } : {}),
    },
    overrideAccess: false,
    user,
    context: { skipAgent: true },
  })

  return Response.json({
    status: 'completed',
    artworkId,
    refinementFlagged,
  })
}

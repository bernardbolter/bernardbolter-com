import { buildArtistPatchFromTimeline } from '@/lib/artOfficial/buildArtistPatch'
import {
  buildArtworkPatchFromTimeline,
  mergeArtworkPatches,
} from '@/lib/artOfficial/buildArtworkPatch'
import {
  applyPracticeKnowledgePatches,
  patchesFromSessionTimeline,
} from '@/lib/artOfficial/applyPracticeKnowledgePatches'
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
  const reapply = body.reapply === true
  const target = commitTarget(session.sessionType as SessionType)
  const weakCount = Array.isArray(session.weakPhases) ? session.weakPhases.length : 0
  const refinementFlagged = weakCount > 1

  let artworkId: number | undefined
  let practiceKnowledge: Awaited<ReturnType<typeof applyPracticeKnowledgePatches>> | undefined

  switch (target.kind) {
    case 'create-artwork': {
      const serverPatch = buildArtworkPatchFromTimeline(session.fieldUpdateTimeline)
      const clientPatch =
        body.artworkData && typeof body.artworkData === 'object'
          ? (body.artworkData as Record<string, unknown>)
          : {}
      // `as any` mirrors the original pattern (data was effectively `any` from
      // `body.artworkData ?? {}`). Required-field validation runs in Payload at
      // commit time; TypeScript can't infer those fields are present statically.
      const merged = mergeArtworkPatches(clientPatch, serverPatch) as any
      const artworkData = {
        ...merged,
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

      const timeline = Array.isArray(session.fieldUpdateTimeline)
        ? session.fieldUpdateTimeline
        : []
      const mode =
        session.sessionType === 'biography' ? 'biography' : 'artist-statement'
      const serverPatch = buildArtistPatchFromTimeline(timeline, mode)
      const clientPatch =
        body.artistPatch && typeof body.artistPatch === 'object'
          ? (body.artistPatch as Record<string, unknown>)
          : {}
      const artistPatch = { ...clientPatch, ...serverPatch }

      if (Object.keys(artistPatch).length === 0) {
        return Response.json(
          {
            error:
              'No biography/statement fields were staged. Continue the chat, then commit again.',
          },
          { status: 412 },
        )
      }

      for (const locale of ['en', 'de'] as const) {
        await payload.update({
          collection: 'artists',
          id: artist.id,
          data: artistPatch,
          overrideAccess: false,
          user,
          locale,
        })
      }
      break
    }

    case 'no-record-write': {
      const patches = patchesFromSessionTimeline(
        session.fieldUpdateTimeline,
        body.practiceKnowledgePatches,
      )
      practiceKnowledge = await applyPracticeKnowledgePatches(payload, user, patches)

      if (
        practiceKnowledge.patchCount > 0 &&
        practiceKnowledge.updated.length === 0
      ) {
        return Response.json(
          {
            error:
              'No Practice Knowledge documents were updated. Run the seed script (pnpm tsx src/scripts/seed-practice-knowledge.ts) or check admin locale tabs (en/de).',
            practiceKnowledge,
          },
          { status: 412 },
        )
      }
      break
    }
  }

  if (!reapply) {
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
  }

  return Response.json({
    status: reapply ? session.status : 'completed',
    artworkId,
    refinementFlagged,
    practiceKnowledge,
  })
}

import { buildArtistPatchFromTimeline } from '@/lib/artOfficial/buildArtistPatch'
import {
  buildArtworkDraftPatchFromSession,
  buildArtworkPatchFromTimeline,
  mergeArtworkPatches,
  sanitizeArtworkCommitPatch,
} from '@/lib/artOfficial/buildArtworkPatch'
import { mergeStagedMediaIntoArtworkPatch } from '@/lib/artOfficial/stagedMedia'
import { buildTriptychPatchFromTimeline } from '@/lib/artOfficial/buildTriptychPatch'
import {
  applyPracticeKnowledgePatches,
  patchesFromSessionTimeline,
} from '@/lib/artOfficial/applyPracticeKnowledgePatches'
import { formatPayloadValidationError } from '@/lib/artOfficial/formatPayloadValidationError'
import { resolveArtworkCommitReferences } from '@/lib/artOfficial/resolveArtworkCommitReferences'
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
  let triptychId: number | undefined
  let practiceKnowledge: Awaited<ReturnType<typeof applyPracticeKnowledgePatches>> | undefined

  function slugifyTitle(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  switch (target.kind) {
    case 'create-artwork': {
      const serverPatch = mergeStagedMediaIntoArtworkPatch(
        buildArtworkPatchFromTimeline(session.fieldUpdateTimeline),
        session.stagedMedia,
      )
      const clientPatch =
        body.artworkData && typeof body.artworkData === 'object'
          ? (body.artworkData as Record<string, unknown>)
          : {}
      // `as any` mirrors the original pattern (data was effectively `any` from
      // `body.artworkData ?? {}`). Required-field validation runs in Payload at
      // commit time; TypeScript can't infer those fields are present statically.
      const draftPatch = buildArtworkDraftPatchFromSession(session)
      let merged = sanitizeArtworkCommitPatch(
        mergeArtworkPatches(
          mergeArtworkPatches(clientPatch, serverPatch),
          draftPatch,
        ),
      ) as Record<string, unknown>

      try {
        merged = await resolveArtworkCommitReferences(
          { payload, user, session },
          merged,
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid artwork commit data'
        return Response.json({ error: message }, { status: 412 })
      }

      const artworkData = {
        ...merged,
        status: 'draft' as const,
      }
      const existingId =
        body.artworkId ??
        (typeof session.artworkRecord === 'object'
          ? session.artworkRecord?.id
          : session.artworkRecord)

      try {
        if (existingId) {
          const updated = await payload.update({
            collection: 'artworks',
            id: existingId,
            data: artworkData as never,
            overrideAccess: false,
            user,
          })
          artworkId = updated.id
        } else {
          const created = await payload.create({
            collection: 'artworks',
            data: artworkData as never,
            overrideAccess: false,
            user,
          })
          artworkId = created.id
        }
      } catch (err) {
        const message =
          formatPayloadValidationError(err) ??
          (err instanceof Error ? err.message : 'Failed to save artwork record')
        console.error('[art-official] commit create/update failed:', err)
        return Response.json({ error: message }, { status: 412 })
      }
      break
    }

    case 'create-triptych': {
      const serverPatch = buildTriptychPatchFromTimeline(session.fieldUpdateTimeline)
      const clientPatch =
        body.triptychData && typeof body.triptychData === 'object'
          ? (body.triptychData as Record<string, unknown>)
          : {}
      const merged: Record<string, unknown> = {
        ...clientPatch,
        ...serverPatch,
        status: 'draft' as const,
      }

      const existingId =
        body.triptychId ??
        (typeof session.triptychRecord === 'object'
          ? session.triptychRecord?.id
          : session.triptychRecord)

      if (existingId) {
        const updated = await payload.update({
          collection: 'triptychs',
          id: existingId,
          data: merged as never,
          overrideAccess: false,
          user,
        })
        triptychId = updated.id
      } else {
        const title = typeof merged.title === 'string' ? merged.title.trim() : ''
        if (!title) {
          return Response.json(
            {
              error:
                'Stage triptych title before commit, or link an existing triptych to this session.',
            },
            { status: 412 },
          )
        }
        if (!merged.slug) {
          merged.slug = slugifyTitle(title)
        }
        if (!merged.series) {
          return Response.json(
            {
              error:
                'New triptychs need a series relationship. Pass triptychData.series (series id) at commit, or create the shell in Triptychs admin and link triptychRecord to this session.',
            },
            { status: 412 },
          )
        }
        const panels = merged.panels
        if (!Array.isArray(panels) || panels.length < 3) {
          return Response.json(
            {
              error:
                'New triptychs need three panels (artwork + position I/II/III). Wire them in Triptychs admin or pass triptychData.panels at commit.',
            },
            { status: 412 },
          )
        }
        const created = await payload.create({
          collection: 'triptychs',
          data: merged as never,
          overrideAccess: false,
          user,
        })
        triptychId = created.id
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
        triptychRecord: triptychId ?? session.triptychRecord,
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
    triptychId,
    refinementFlagged,
    practiceKnowledge,
  })
}

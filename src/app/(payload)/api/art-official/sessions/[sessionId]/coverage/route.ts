import { requireStaff } from '@/lib/artOfficial/requireStaff'
import {
  ARTWORK_FIELD_CATALOG,
  type CareerStage,
} from '@/lib/artOfficial/fieldCatalog'
import { computeSessionCoverage } from '@/lib/artOfficial/sessionCoverage'
import { listSeriesWithParents } from '@/lib/artOfficial/seriesSlugs'

type RouteContext = { params: Promise<{ sessionId: string }> }

export async function GET(_request: Request, context: RouteContext) {
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

  let careerStage: CareerStage = 'studio'
  if (session.artistId) {
    const artistId =
      typeof session.artistId === 'object' && session.artistId !== null
        ? session.artistId.id
        : session.artistId
    if (artistId != null) {
      try {
        const artist = await payload.findByID({
          collection: 'artists',
          id: artistId,
          depth: 0,
          overrideAccess: false,
          user,
        })
        if (
          artist.careerStage === 'market' ||
          artist.careerStage === 'institutional' ||
          artist.careerStage === 'studio'
        ) {
          careerStage = artist.careerStage
        }
      } catch {
        // keep default studio
      }
    }
  }

  let artwork: Record<string, unknown> | null = null
  let artworkId: string | null = null

  if (session.artworkRecord) {
    const recordId =
      typeof session.artworkRecord === 'object' && session.artworkRecord !== null
        ? session.artworkRecord.id
        : session.artworkRecord
    if (recordId != null) {
      artworkId = String(recordId)
      try {
        artwork = (await payload.findByID({
          collection: 'artworks',
          id: recordId,
          depth: 0,
          overrideAccess: false,
          user,
        })) as unknown as Record<string, unknown>
      } catch {
        artwork = null
      }
    }
  }

  const seriesRecords = await listSeriesWithParents({ payload, user })

  const report = computeSessionCoverage({
    session: {
      sessionId: session.sessionId ?? sessionId,
      sessionType: session.sessionType,
      artworkId,
      careerStage,
      fieldUpdateTimeline: session.fieldUpdateTimeline,
      weakPhases: session.weakPhases,
      formalContributionAccuracy: session.formalContributionAccuracy,
      dialogueRefinementFlag: session.dialogueRefinementFlag,
      refinementNotes: session.refinementNotes,
    },
    artwork,
    careerStage,
    catalog: ARTWORK_FIELD_CATALOG,
    seriesRecords,
  })

  return Response.json(report)
}

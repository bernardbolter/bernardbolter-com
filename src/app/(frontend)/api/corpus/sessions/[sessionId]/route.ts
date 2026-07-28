import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  buildTier5SessionByIdResponse,
  TIER5_SESSION_SELECT,
} from '@/lib/corpus/buildTier5SessionsResponse'
import { CORPUS_BASE } from '@/lib/corpus/constants'
import { CORPUS_LD_JSON_HEADERS } from '@/lib/corpus/ldJsonHeaders'
import config from '@payload-config'

/** Always live from Payload — never an ISR snapshot shared with HTML pages. */
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ sessionId: string }> }

/**
 * Session-level Tier 5 — full transcript streams for any completed session,
 * including event-enrichment / artist-statement with no primaryArtwork.
 *
 * GET /api/corpus/sessions/[sessionId]
 * GET /api/corpus/sessions/[sessionId]?tier=5
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { sessionId: raw } = await params
  const sessionId = raw?.trim()
  if (!sessionId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORPUS_LD_JSON_HEADERS })
  }

  const { searchParams } = new URL(request.url)
  const tier = searchParams.get('tier')?.trim()
  if (tier != null && tier !== '' && tier !== '5') {
    return NextResponse.json(
      { error: 'Only tier=5 is supported on this path' },
      { status: 400, headers: CORPUS_LD_JSON_HEADERS },
    )
  }

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { sessionId: { equals: sessionId } },
        { status: { equals: 'completed' } },
      ],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
    select: TIER5_SESSION_SELECT,
  })

  const session = result.docs[0]
  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORPUS_LD_JSON_HEADERS })
  }

  const body = buildTier5SessionByIdResponse({
    session,
    baseUrl: CORPUS_BASE,
  })
  if (!body) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORPUS_LD_JSON_HEADERS })
  }

  return NextResponse.json(body, { headers: CORPUS_LD_JSON_HEADERS })
}

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  buildTier5SessionByIdResponse,
  TIER5_SESSION_SELECT,
} from '@/lib/corpus/buildTier5SessionsResponse'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import config from '@payload-config'

export const revalidate = 3600

type RouteParams = { params: Promise<{ sessionId: string }> }

const CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
} as const

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
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const tier = searchParams.get('tier')?.trim()
  if (tier != null && tier !== '' && tier !== '5') {
    return NextResponse.json(
      { error: 'Only tier=5 is supported on this path' },
      { status: 400 },
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
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = buildTier5SessionByIdResponse({
    session,
    baseUrl: getSiteBaseUrl(),
  })
  if (!body) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(body, { headers: CACHE_HEADERS })
}

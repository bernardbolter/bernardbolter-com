import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  buildTier5EventSessionsResponse,
  buildTier5SessionsResponse,
  TIER5_SESSION_SELECT,
} from '@/lib/corpus/buildTier5SessionsResponse'
import { CORPUS_BASE } from '@/lib/corpus/constants'
import { corpusResponseHeaders } from '@/lib/corpus/ldJsonHeaders'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import config from '@payload-config'

/** Always live from Payload — never an ISR snapshot shared with HTML pages. */
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ slug: string }> }

/**
 * Tier 5 — completed session transcripts for one artwork or event.
 * GET /api/corpus/[slug]/sessions
 * Optional `?type=artwork|event` when the same slug exists in both collections.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const headers = corpusResponseHeaders(request)
  const { slug: rawSlug } = await params
  const slug = rawSlug?.trim()
  if (!slug || !isPublicCatalogueSlug(slug)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  }

  const typeParam = new URL(request.url).searchParams.get('type')?.trim().toLowerCase()
  const preferArtwork = typeParam === 'artwork'
  const preferEvent = typeParam === 'event'

  const payload = await getPayload({ config })

  const [artworkResult, eventResult] = await Promise.all([
    payload.find({
      collection: 'artworks',
      locale: 'en',
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
      limit: 1,
      depth: 0,
      select: { slug: true },
      overrideAccess: true,
    }),
    payload.find({
      collection: 'events',
      locale: 'en',
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
      limit: 1,
      depth: 0,
      select: { slug: true },
      overrideAccess: true,
    }),
  ])

  const artwork = artworkResult.docs[0] ?? null
  const event = eventResult.docs[0] ?? null

  if (!artwork && !event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  }

  if (artwork && event && !preferArtwork && !preferEvent) {
    return NextResponse.json(
      {
        error: 'Ambiguous slug',
        message:
          'This slug matches both an artwork and an event. Pass ?type=artwork or ?type=event.',
        artworkSessionsUrl: `${CORPUS_BASE}/api/corpus/${encodeURIComponent(slug)}/sessions?type=artwork`,
        eventSessionsUrl: `${CORPUS_BASE}/api/corpus/${encodeURIComponent(slug)}/sessions?type=event`,
      },
      { status: 409, headers },
    )
  }

  const asEvent =
    preferEvent || (!preferArtwork && !artwork && Boolean(event))

  const sessionsResult = await payload.find({
    collection: 'sessions',
    where: { status: { equals: 'completed' } },
    limit: 200,
    depth: 1,
    sort: '-completedAt',
    overrideAccess: true,
    select: TIER5_SESSION_SELECT,
  })

  if (asEvent && event) {
    const body = buildTier5EventSessionsResponse({
      eventSlug: slug,
      sessions: sessionsResult.docs,
      baseUrl: CORPUS_BASE,
    })
    return NextResponse.json(body, { headers })
  }

  if (!artwork) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  }

  const body = buildTier5SessionsResponse({
    artworkSlug: slug,
    sessions: sessionsResult.docs,
    baseUrl: CORPUS_BASE,
  })

  return NextResponse.json(body, { headers })
}

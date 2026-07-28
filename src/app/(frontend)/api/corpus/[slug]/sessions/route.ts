import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  buildTier5SessionsResponse,
  TIER5_SESSION_SELECT,
} from '@/lib/corpus/buildTier5SessionsResponse'
import { CORPUS_BASE } from '@/lib/corpus/constants'
import { CORPUS_LD_JSON_HEADERS } from '@/lib/corpus/ldJsonHeaders'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import config from '@payload-config'

/** Always live from Payload — never an ISR snapshot shared with HTML pages. */
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ slug: string }> }

/**
 * Tier 5 — completed session transcripts for one artwork.
 * GET /api/corpus/[slug]/sessions
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { slug: rawSlug } = await params
  const slug = rawSlug?.trim()
  if (!slug || !isPublicCatalogueSlug(slug)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORPUS_LD_JSON_HEADERS })
  }

  const payload = await getPayload({ config })

  const artworkResult = await payload.find({
    collection: 'artworks',
    locale: 'en',
    where: {
      and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
    },
    limit: 1,
    depth: 0,
    select: { slug: true },
    overrideAccess: true,
  })

  if (!artworkResult.docs[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORPUS_LD_JSON_HEADERS })
  }

  const sessionsResult = await payload.find({
    collection: 'sessions',
    where: { status: { equals: 'completed' } },
    limit: 200,
    depth: 1,
    sort: '-completedAt',
    overrideAccess: true,
    select: TIER5_SESSION_SELECT,
  })

  const body = buildTier5SessionsResponse({
    artworkSlug: slug,
    sessions: sessionsResult.docs,
    baseUrl: CORPUS_BASE,
  })

  return NextResponse.json(body, { headers: CORPUS_LD_JSON_HEADERS })
}

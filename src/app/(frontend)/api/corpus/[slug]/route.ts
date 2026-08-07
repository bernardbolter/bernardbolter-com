import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { CORPUS_BASE } from '@/lib/corpus/constants'
import { fetchCorpusArtistForReciprocalLinks } from '@/lib/corpus/fetchCorpusData'
import { fetchSessionCountBySlug } from '@/lib/corpus/fetchSessionCounts'
import { corpusResponseHeaders } from '@/lib/corpus/ldJsonHeaders'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'
import config from '@payload-config'

/** Always live from Payload — never an ISR snapshot shared with HTML pages. */
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ slug: string }> }

/**
 * Per-artwork or per-event corpus record (Tier 4 artwork / Tier 5 redirect).
 * `?tier=5` permanently redirects to `/api/corpus/[slug]/sessions`.
 * Optional `?type=artwork|event` when the same slug exists in both collections.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const headers = corpusResponseHeaders(request)
  const { slug: rawSlug } = await params
  const slug = rawSlug?.trim()
  if (!slug || !isPublicCatalogueSlug(slug)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  }

  const { searchParams } = new URL(request.url)
  const tier = searchParams.get('tier')?.trim()
  const typeParam = searchParams.get('type')?.trim()

  if (tier === '5') {
    const sessionsUrl = new URL(
      `/api/corpus/${encodeURIComponent(slug)}/sessions`,
      CORPUS_BASE,
    )
    if (typeParam === 'artwork' || typeParam === 'event') {
      sessionsUrl.searchParams.set('type', typeParam)
    }
    return NextResponse.redirect(sessionsUrl, 308)
  }

  if (tier != null && tier !== '' && tier !== '4') {
    return NextResponse.json(
      {
        error: 'Invalid tier',
        accepted: ['4', '5'],
        message:
          'Tier 4 is the default record. Tier 5 lives at /api/corpus/{slug}/sessions.',
      },
      { status: 400, headers },
    )
  }

  const payload = await getPayload({ config })

  // Tier 4 remains artwork-keyed. Event slugs without a matching artwork 404 here;
  // their Tier 5 sessions are available at /api/corpus/{eventSlug}/sessions.
  if (typeParam === 'event') {
    return NextResponse.json(
      {
        error: 'Event Tier 4 not implemented',
        message:
          'Event corpus records are exposed at Tier 5 only. Use /api/corpus/{slug}/sessions?type=event.',
        sessionsUrl: `${CORPUS_BASE}/api/corpus/${encodeURIComponent(slug)}/sessions?type=event`,
      },
      { status: 404, headers },
    )
  }

  const [result, sessionCountBySlug, artist] = await Promise.all([
    payload.find({
      collection: 'artworks',
      locale: 'en',
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
      limit: 1,
      depth: 3,
      overrideAccess: true,
    }),
    fetchSessionCountBySlug(payload),
    fetchCorpusArtistForReciprocalLinks(payload),
  ])

  const artwork = result.docs[0]
  if (!artwork) {
    // Fall through: if this slug is an event, point clients at Tier 5 sessions.
    const eventResult = await payload.find({
      collection: 'events',
      locale: 'en',
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
      limit: 1,
      depth: 0,
      select: { slug: true },
      overrideAccess: true,
    })
    if (eventResult.docs[0]) {
      return NextResponse.json(
        {
          error: 'Event Tier 4 not implemented',
          message:
            'This slug matches a published event. Use Tier 5 sessions: /api/corpus/{slug}/sessions.',
          sessionsUrl: `${CORPUS_BASE}/api/corpus/${encodeURIComponent(slug)}/sessions`,
        },
        { status: 404, headers },
      )
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  }

  const body = buildArtworkJsonLd(artwork, null, {
    baseUrl: CORPUS_BASE,
    sessionCount: sessionCountBySlug.get(slug) ?? 0,
    includeTraversalLinks: true,
    artist,
  })

  return NextResponse.json(body, { headers })
}

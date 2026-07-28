import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { CORPUS_BASE } from '@/lib/corpus/constants'
import { fetchSessionCountBySlug } from '@/lib/corpus/fetchSessionCounts'
import { corpusResponseHeaders } from '@/lib/corpus/ldJsonHeaders'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'
import config from '@payload-config'

/** Always live from Payload — never an ISR snapshot shared with HTML pages. */
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ slug: string }> }

/**
 * Per-artwork corpus record (Tier 4).
 * `?tier=5` permanently redirects to `/api/corpus/[slug]/sessions`.
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

  if (tier === '5') {
    return NextResponse.redirect(
      new URL(`/api/corpus/${encodeURIComponent(slug)}/sessions`, CORPUS_BASE),
      308,
    )
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

  const [result, sessionCountBySlug] = await Promise.all([
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
  ])

  const artwork = result.docs[0]
  if (!artwork) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  }

  const body = buildArtworkJsonLd(artwork, null, {
    baseUrl: CORPUS_BASE,
    sessionCount: sessionCountBySlug.get(slug) ?? 0,
    includeTraversalLinks: true,
  })

  return NextResponse.json(body, { headers })
}

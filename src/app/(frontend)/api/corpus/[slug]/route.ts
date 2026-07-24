import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { buildTier5SessionsResponse } from '@/lib/corpus/buildTier5SessionsResponse'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'
import config from '@payload-config'

export const revalidate = 3600

type RouteParams = { params: Promise<{ slug: string }> }

const CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
} as const

/**
 * Per-artwork corpus record.
 * - default / missing tier → Tier 3/4 artwork JSON-LD
 * - `?tier=5` → completed session transcripts (artistRecord + artism:DialogueSelfAudit)
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { slug: rawSlug } = await params
  const slug = rawSlug?.trim()
  if (!slug || !isPublicCatalogueSlug(slug)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const tier = searchParams.get('tier')?.trim()
  const payload = await getPayload({ config })

  if (tier === '5') {
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
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const sessionsResult = await payload.find({
      collection: 'sessions',
      where: { status: { equals: 'completed' } },
      limit: 200,
      depth: 1,
      sort: '-completedAt',
      overrideAccess: true,
      select: {
        sessionId: true,
        sessionType: true,
        status: true,
        createdAt: true,
        completedAt: true,
        primaryArtwork: true,
        artworkRecord: true,
        mentionedArtworks: true,
        messages: true,
        firstImpression: true,
        secondDescription: true,
        fieldUpdateTimeline: true,
        sessionNotes: true,
        weakPhases: true,
        blindDescriptionUseful: true,
        formalContributionAccuracy: true,
        dialogueRefinementFlag: true,
        refinementNotes: true,
        agentDraftDescriptionShort: true,
        agentDraftDescriptionLong: true,
        agentDraftConceptualKeywords: true,
        agentDraftFormalContributionAssessment: true,
        agentModel: true,
      },
    })

    const body = buildTier5SessionsResponse({
      artworkSlug: slug,
      sessions: sessionsResult.docs,
      baseUrl: getSiteBaseUrl(),
    })

    return NextResponse.json(body, { headers: CACHE_HEADERS })
  }

  const result = await payload.find({
    collection: 'artworks',
    locale: 'en',
    where: {
      and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
    },
    limit: 1,
    depth: 3,
    overrideAccess: true,
  })

  const artwork = result.docs[0]
  if (!artwork) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = buildArtworkJsonLd(artwork, null, { baseUrl: getSiteBaseUrl() })

  return NextResponse.json(body, { headers: CACHE_HEADERS })
}

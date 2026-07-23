import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'
import config from '@payload-config'

export const revalidate = 3600

type RouteParams = { params: Promise<{ slug: string }> }

/** Per-artwork corpus record (Tier 3/4 machine representation). */
export async function GET(_request: Request, { params }: RouteParams) {
  const { slug: rawSlug } = await params
  const slug = rawSlug?.trim()
  if (!slug || !isPublicCatalogueSlug(slug)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const payload = await getPayload({ config })
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

  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}

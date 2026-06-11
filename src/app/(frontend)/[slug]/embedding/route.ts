import { NextResponse } from 'next/server'

import {
  buildArtworkEmbeddingPendingResponse,
  buildArtworkEmbeddingResponse,
} from '@/lib/artwork/embeddingResponse'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getPublishedArtworkForPage } from '@/lib/payload/artworkPage'
import { fetchArtworkClipEmbedding } from '@/lib/payload/clipEmbedding'

type RouteContext = { params: Promise<{ slug: string }> }

const CACHE_CONTROL = 'public, max-age=86400'

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { slug } = await context.params
  const artwork = await getPublishedArtworkForPage(slug)

  if (!artwork) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const embedding = await fetchArtworkClipEmbedding(artwork.id)
  if (!embedding) {
    return NextResponse.json(buildArtworkEmbeddingPendingResponse(), {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }

  const baseUrl = getSiteBaseUrl()
  const body = buildArtworkEmbeddingResponse(artwork, `${baseUrl}/${slug}`, embedding)

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': CACHE_CONTROL,
    },
  })
}

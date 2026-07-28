import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { buildCorpusIndexResponse } from '@/lib/corpus/buildCorpusResponse'
import { parseCorpusIndexFilters } from '@/lib/corpus/corpusIndexFilters'
import { fetchCorpusArtworks } from '@/lib/corpus/fetchCorpusData'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import config from '@payload-config'

/** Always live from Payload — never an ISR snapshot shared with HTML pages. */
export const dynamic = 'force-dynamic'

/** Canonical Tier-1 machine index (`/api/corpus?format=index` remains a legacy alias). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filters = parseCorpusIndexFilters(searchParams)

  const payload = await getPayload({ config })
  const artworks = await fetchCorpusArtworks(payload, filters)
  const body = buildCorpusIndexResponse(artworks, getSiteBaseUrl(), filters)

  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      // CDN may hold briefly; write-path revalidateCorpusFeed purges these URLs.
      'Cache-Control': 'public, max-age=0, s-maxage=60, must-revalidate',
    },
  })
}

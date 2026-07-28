import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { buildCorpusIndexResponse } from '@/lib/corpus/buildCorpusResponse'
import {
  CORPUS_BASE,
  CORPUS_INDEX_PER_PAGE,
  CORPUS_SURVEY_PER_PAGE,
} from '@/lib/corpus/constants'
import { parseCorpusIndexFilters } from '@/lib/corpus/corpusIndexFilters'
import {
  fetchCorpusArtworks,
  fetchCorpusSeries,
  fetchCorpusTotalArtworks,
} from '@/lib/corpus/fetchCorpusData'
import { fetchSessionCountBySlug } from '@/lib/corpus/fetchSessionCounts'
import { corpusResponseHeaders } from '@/lib/corpus/ldJsonHeaders'
import { parsePageParam, parsePerPageParam } from '@/lib/corpus/pagination'
import config from '@payload-config'

/** Always live from Payload — never an ISR snapshot shared with HTML pages. */
export const dynamic = 'force-dynamic'

/** Canonical Tier-1 / Tier-2 machine index. */
export async function GET(request: Request) {
  const headers = corpusResponseHeaders(request)
  const { searchParams } = new URL(request.url)
  const depthRaw = searchParams.get('depth')?.trim()

  if (depthRaw != null && depthRaw !== '' && depthRaw !== 'survey') {
    return NextResponse.json(
      {
        error: 'Invalid depth',
        accepted: ['survey'],
        message: 'Only ?depth=survey is accepted. Omit depth for Tier 1 triage.',
      },
      { status: 400, headers },
    )
  }

  const depth = depthRaw === 'survey' ? 'survey' : 'index'
  const filters = parseCorpusIndexFilters(searchParams)
  const defaultPerPage = depth === 'survey' ? CORPUS_SURVEY_PER_PAGE : CORPUS_INDEX_PER_PAGE
  const page = parsePageParam(searchParams.get('page'))
  const perPage = parsePerPageParam(searchParams.get('perPage'), defaultPerPage, defaultPerPage)

  const payload = await getPayload({ config })
  const [artworks, seriesList, totalArtworks, sessionCountBySlug] = await Promise.all([
    fetchCorpusArtworks(payload, filters),
    fetchCorpusSeries(payload),
    fetchCorpusTotalArtworks(payload),
    fetchSessionCountBySlug(payload),
  ])

  const body = buildCorpusIndexResponse({
    artworks,
    totalArtworks,
    seriesList,
    baseUrl: CORPUS_BASE,
    filters,
    depth,
    page,
    perPage,
    sessionCountBySlug,
  })

  return NextResponse.json(body, { headers })
}

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  buildCorpusResponse,
  type CorpusFormat,
} from '@/lib/corpus/buildCorpusResponse'
import {
  CORPUS_BASE,
  CORPUS_INDEX_PER_PAGE,
  CORPUS_ROOT_MAX_PER_PAGE,
  CORPUS_ROOT_PER_PAGE,
  CORPUS_SURVEY_PER_PAGE,
} from '@/lib/corpus/constants'
import { parseCorpusIndexFilters } from '@/lib/corpus/corpusIndexFilters'
import {
  fetchCorpusArtist,
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

function parseFormat(value: string | null): CorpusFormat {
  return value === 'index' ? 'index' : 'jsonld'
}

export async function GET(request: Request) {
  const headers = corpusResponseHeaders(request)
  const { searchParams } = new URL(request.url)
  const format = parseFormat(searchParams.get('format'))
  const filters = parseCorpusIndexFilters(searchParams)

  const depthRaw = searchParams.get('depth')?.trim()
  if (format === 'index' && depthRaw != null && depthRaw !== '' && depthRaw !== 'survey') {
    return NextResponse.json(
      {
        error: 'Invalid depth',
        accepted: ['survey'],
        message: 'Only ?depth=survey is accepted. Omit depth for Tier 1 triage.',
      },
      { status: 400, headers },
    )
  }

  const depth = format === 'index' && depthRaw === 'survey' ? 'survey' : 'index'
  const defaultPerPage =
    format === 'index'
      ? depth === 'survey'
        ? CORPUS_SURVEY_PER_PAGE
        : CORPUS_INDEX_PER_PAGE
      : CORPUS_ROOT_PER_PAGE
  const maxPerPage = format === 'jsonld' ? CORPUS_ROOT_MAX_PER_PAGE : defaultPerPage
  const page = parsePageParam(searchParams.get('page'))
  const perPage = parsePerPageParam(searchParams.get('perPage'), defaultPerPage, maxPerPage)

  const payload = await getPayload({ config })
  const baseUrl = CORPUS_BASE

  const [artworks, seriesList, artist, totalArtworks, sessionCountBySlug] = await Promise.all([
    fetchCorpusArtworks(payload, filters),
    fetchCorpusSeries(payload),
    fetchCorpusArtist(payload),
    fetchCorpusTotalArtworks(payload),
    fetchSessionCountBySlug(payload),
  ])

  const body = buildCorpusResponse(format, artworks, seriesList, artist, baseUrl, filters, {
    totalArtworks,
    depth,
    page,
    perPage,
    sessionCountBySlug,
  })

  return NextResponse.json(body, { headers })
}

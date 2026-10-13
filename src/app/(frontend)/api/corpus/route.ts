import { NextResponse } from 'next/server'

import {
  buildIndexResponseFromArtifact,
  buildRootFeedFromArtifact,
} from '@/lib/corpus/artifact/projectFromArtifact'
import {
  artifactResponseHeaders,
  readCorpusArtifact,
} from '@/lib/corpus/artifact/readCorpusArtifact'
import {
  CORPUS_BASE,
  CORPUS_INDEX_PER_PAGE,
  CORPUS_ROOT_MAX_PER_PAGE,
  CORPUS_ROOT_PER_PAGE,
  CORPUS_SURVEY_PER_PAGE,
} from '@/lib/corpus/constants'
import { parseCorpusIndexFilters } from '@/lib/corpus/corpusIndexFilters'
import { corpusResponseHeaders } from '@/lib/corpus/ldJsonHeaders'
import { parsePageParam, parsePerPageParam } from '@/lib/corpus/pagination'

/**
 * Legacy bulk / format=index entry — served from the nightly artifact.
 * Prefer /api/corpus/index, /api/corpus/{slug}, /api/corpus/all.
 */
export const dynamic = 'force-dynamic'

function parseFormat(value: string | null): 'index' | 'jsonld' {
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

  const loaded = await readCorpusArtifact()
  if (!loaded) {
    return NextResponse.json(
      {
        error: 'Corpus artifact unavailable',
        message:
          'Nightly artifact missing or unparseable. No live fallback. Re-run pnpm corpus:build.',
      },
      { status: 503, headers },
    )
  }

  if (format === 'index') {
    const body = buildIndexResponseFromArtifact({
      artifact: loaded.artifact,
      filters,
      depth,
      page,
      perPage,
      baseUrl: CORPUS_BASE,
    })
    return NextResponse.json(body, {
      headers: artifactResponseHeaders(headers, loaded.meta),
    })
  }

  const body = buildRootFeedFromArtifact({
    artifact: loaded.artifact,
    filters,
    page,
    perPage,
    baseUrl: CORPUS_BASE,
  })

  return NextResponse.json(body, {
    headers: artifactResponseHeaders(headers, loaded.meta),
  })
}

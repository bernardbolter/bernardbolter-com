import { NextResponse } from 'next/server'

import { buildIndexResponseFromArtifact } from '@/lib/corpus/artifact/projectFromArtifact'
import {
  artifactResponseHeaders,
  readCorpusArtifact,
} from '@/lib/corpus/artifact/readCorpusArtifact'
import {
  CORPUS_INDEX_PER_PAGE,
  CORPUS_SURVEY_PER_PAGE,
} from '@/lib/corpus/constants'
import { parseCorpusIndexFilters } from '@/lib/corpus/corpusIndexFilters'
import { corpusResponseHeaders } from '@/lib/corpus/ldJsonHeaders'
import { parsePageParam, parsePerPageParam } from '@/lib/corpus/pagination'

/**
 * Canonical Tier-1 / Tier-2 machine index — served from the nightly artifact.
 * Live Payload assembly remains in codebase for corpus:build only.
 */
export const dynamic = 'force-dynamic'

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

  const body = buildIndexResponseFromArtifact({
    artifact: loaded.artifact,
    filters,
    depth,
    page,
    perPage,
  })

  return NextResponse.json(body, {
    headers: artifactResponseHeaders(headers, loaded.meta),
  })
}

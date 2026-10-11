import { NextResponse } from 'next/server'

import { findArtifactWork } from '@/lib/corpus/artifact/projectFromArtifact'
import {
  artifactResponseHeaders,
  readCorpusArtifact,
} from '@/lib/corpus/artifact/readCorpusArtifact'
import { CORPUS_BASE } from '@/lib/corpus/constants'
import { corpusResponseHeaders } from '@/lib/corpus/ldJsonHeaders'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'

/**
 * Per-artwork corpus record (Tier 4) — slice from the nightly artifact.
 * `?tier=5` permanently redirects to `/api/corpus/[slug]/sessions` (live Tier 5).
 */
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ slug: string }> }

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

  const work = findArtifactWork(loaded.artifact, slug)
  if (!work) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  }

  return NextResponse.json(work.record, {
    headers: artifactResponseHeaders(headers, loaded.meta),
  })
}

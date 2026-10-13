import { NextResponse } from 'next/server'

import {
  artifactResponseHeaders,
  readCorpusArtifact,
} from '@/lib/corpus/artifact/readCorpusArtifact'
import { corpusResponseHeaders } from '@/lib/corpus/ldJsonHeaders'

/** Whole nightly artifact. */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const headers = corpusResponseHeaders(request)
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

  return NextResponse.json(loaded.artifact, {
    headers: artifactResponseHeaders(headers, loaded.meta),
  })
}

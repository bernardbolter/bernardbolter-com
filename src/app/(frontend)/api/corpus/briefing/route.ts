import { NextResponse } from 'next/server'

import {
  artifactResponseHeaders,
  readCorpusBriefing,
} from '@/lib/corpus/artifact/readCorpusArtifact'
import { corpusResponseHeaders } from '@/lib/corpus/ldJsonHeaders'

/** Nightly session briefing — no private session streams. */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const headers = corpusResponseHeaders(request)
  const loaded = await readCorpusBriefing()
  if (!loaded) {
    return NextResponse.json(
      {
        error: 'Corpus briefing unavailable',
        message:
          'Nightly briefing missing or unparseable. No live fallback. Re-run pnpm corpus:build.',
      },
      { status: 503, headers },
    )
  }

  return NextResponse.json(loaded.briefing, {
    headers: artifactResponseHeaders(headers, loaded.meta),
  })
}

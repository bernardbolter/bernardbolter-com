import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  buildCorpusResponse,
  type CorpusFormat,
} from '@/lib/corpus/buildCorpusResponse'
import {
  fetchCorpusArtist,
  fetchCorpusArtworks,
  fetchCorpusSeries,
} from '@/lib/corpus/fetchCorpusData'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import config from '@payload-config'

export const revalidate = 3600

function parseFormat(value: string | null): CorpusFormat {
  return value === 'index' ? 'index' : 'jsonld'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const seriesFilter = searchParams.get('series')
  const format = parseFormat(searchParams.get('format'))

  const payload = await getPayload({ config })
  const baseUrl = getSiteBaseUrl()

  const [artworks, seriesList, artist] = await Promise.all([
    fetchCorpusArtworks(payload, seriesFilter),
    fetchCorpusSeries(payload),
    fetchCorpusArtist(payload),
  ])

  const body = buildCorpusResponse(format, artworks, seriesList, artist, baseUrl, seriesFilter)

  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}

import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'

import CorpusIndex, { rowsFromArtworks } from '@/components/corpus/CorpusIndex'
import { parseCorpusIndexFilters } from '@/lib/corpus/corpusIndexFilters'
import { fetchCorpusArtworks, fetchCorpusSeries } from '@/lib/corpus/fetchCorpusData'
import { withDbUnavailableFallback } from '@/lib/payload/buildSafeDb'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Corpus',
  description: 'Orientation index of Bernard Bolter’s published archive — triage, not discovery.',
  alternates: { canonical: '/corpus' },
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export default async function CorpusPage({ searchParams }: PageProps) {
  const raw = await searchParams
  const params = new URLSearchParams()
  for (const key of ['series', 'yearFrom', 'yearTo', 'status', 'hasVisionAnalyses']) {
    const value = firstParam(raw[key])
    if (value) params.set(key, value)
  }
  const filters = parseCorpusIndexFilters(params)

  const payload = await getPayload({ config })
  const [artworks, seriesList] = await Promise.all([
    withDbUnavailableFallback(() => fetchCorpusArtworks(payload, filters), []),
    withDbUnavailableFallback(() => fetchCorpusSeries(payload), []),
  ])

  return (
    <div className="bio-page__container">
      <CorpusIndex
        rows={rowsFromArtworks(artworks)}
        seriesList={seriesList}
        filters={filters}
      />
    </div>
  )
}

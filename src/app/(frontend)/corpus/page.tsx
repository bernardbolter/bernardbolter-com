import type { Metadata } from 'next'
import { Suspense } from 'react'

import CorpusFiltersPersist from '@/components/corpus/CorpusFiltersPersist'
import CorpusIndex from '@/components/corpus/CorpusIndex'
import {
  filterArtifactWorks,
  rowsFromArtifactWorks,
  seriesOptionsFromArtifact,
} from '@/lib/corpus/artifact/projectFromArtifact'
import { readCorpusArtifact } from '@/lib/corpus/artifact/readCorpusArtifact'
import { parseCorpusIndexFilters } from '@/lib/corpus/corpusIndexFilters'

/** HTML index tracks the nightly artifact — not a separate Payload ISR path. */
export const dynamic = 'force-dynamic'

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

  const loaded = await readCorpusArtifact()
  const rows = loaded
    ? rowsFromArtifactWorks(filterArtifactWorks(loaded.artifact.works, filters))
    : []
  const seriesList = loaded ? seriesOptionsFromArtifact(loaded.artifact) : []

  return (
    <div className="bio-page__container">
      <Suspense fallback={null}>
        <CorpusFiltersPersist />
      </Suspense>
      {!loaded ? (
        <p className="bio__masonry-caption">
          Corpus index unavailable — nightly artifact missing or unparseable.
        </p>
      ) : null}
      <CorpusIndex rows={rows} seriesList={seriesList} filters={filters} />
    </div>
  )
}

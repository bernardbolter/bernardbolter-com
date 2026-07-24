import type { Artist, Artwork, Series } from '@/payload-types'

export type PlannedWorkContextEntry = {
  title: string
  status: string
  motivatingNote?: string | null
  blocker?: string | null
  relatedSeriesSlug?: string | null
  relatedArtworkTitles?: string[]
}

function readSeriesSlug(value: number | Series | null | undefined): string | null {
  if (!value || typeof value !== 'object') return null
  return value.slug?.trim() || null
}

function readArtworkTitle(value: number | Artwork | null | undefined): string | null {
  if (!value || typeof value !== 'object') return null
  return value.title?.trim() || null
}

/** Active/blocked/idea planned works for Art/Official context (excludes migrated). */
export function collectPlannedWorksForPrompt(
  artist: Pick<Artist, 'plannedWorks'>,
): PlannedWorkContextEntry[] {
  return (artist.plannedWorks ?? [])
    .filter((entry) => {
      if (!entry?.title?.trim()) return false
      const status = entry.status ?? 'idea'
      return status !== 'complete-migrated'
    })
    .map((entry) => ({
      title: entry.title.trim(),
      status: entry.status ?? 'idea',
      motivatingNote: entry.motivatingNote?.trim() || null,
      blocker: entry.blocker?.trim() || null,
      relatedSeriesSlug: readSeriesSlug(entry.relatedSeries),
      relatedArtworkTitles: (entry.relatedArtworks ?? [])
        .map((artwork) => readArtworkTitle(artwork))
        .filter((title): title is string => Boolean(title)),
    }))
}

/**
 * Practice-knowledge style block for stated future intentions.
 * Prefer entries whose relatedSeries matches the current session series when known.
 */
export function buildPlannedWorksContextBlock(
  entries: PlannedWorkContextEntry[],
  sessionSeriesSlug?: string | null,
): string | null {
  if (!entries.length) return null

  const seriesSlug = sessionSeriesSlug?.trim() || null
  const relevant = seriesSlug
    ? entries.filter((entry) => entry.relatedSeriesSlug === seriesSlug)
    : []
  const listed = relevant.length > 0 ? relevant : entries

  const lines = listed.map((entry) => {
    const bits = [`- **${entry.title}** (${entry.status})`]
    if (entry.motivatingNote) bits.push(`  Motive: ${entry.motivatingNote}`)
    if (entry.blocker) bits.push(`  Blocker: ${entry.blocker}`)
    if (entry.relatedSeriesSlug) bits.push(`  Series: ${entry.relatedSeriesSlug}`)
    if (entry.relatedArtworkTitles?.length) {
      bits.push(`  Responds to: ${entry.relatedArtworkTitles.join(', ')}`)
    }
    return bits.join('\n')
  })

  const scopeNote =
    relevant.length > 0 && seriesSlug
      ? `These planned works relate to the current series (${seriesSlug}). Use as Practice Knowledge context — do not invent catalogue fields for unmade work.`
      : 'Stated future intentions on the Artist record (not published Artworks). Use as Practice Knowledge context when relevant — do not invent catalogue fields for unmade work.'

  return `PLANNED WORKS\n\n${scopeNote}\n\n${lines.join('\n\n')}`
}

import { CORPUS_BASE } from '@/lib/corpus/constants'
import type { Artist, Artwork } from '@/payload-types'

export type ReciprocalLink = {
  name: string
  url: string
}

function relationMatchesArtwork(
  linked: number | Artwork | null | undefined,
  artwork: Pick<Artwork, 'id' | 'slug'>,
): boolean {
  if (linked == null) return false
  if (typeof linked === 'number') return linked === artwork.id
  if (typeof linked !== 'object') return false
  if (typeof linked.id === 'number' && linked.id === artwork.id) return true
  const linkedSlug = linked.slug?.trim()
  const artworkSlug = artwork.slug?.trim()
  return Boolean(linkedSlug && artworkSlug && linkedSlug === artworkSlug)
}

function entryLinksArtwork(
  linked: (number | Artwork)[] | null | undefined,
  artwork: Pick<Artwork, 'id' | 'slug'>,
): boolean {
  return (linked ?? []).some((row) => relationMatchesArtwork(row, artwork))
}

/**
 * Live reverse lookup: public statement throughlines whose linkedArtworkSlugs
 * include this artwork. No stored backfill — same pattern as Visual Similarity.
 */
export function findRelatedThroughlines(
  artist: Artist | null | undefined,
  artwork: Pick<Artwork, 'id' | 'slug'>,
  baseUrl: string = CORPUS_BASE,
): ReciprocalLink[] {
  if (!artist) return []
  const origin = baseUrl.replace(/\/$/, '')
  const out: ReciprocalLink[] = []

  for (const entry of artist.statementThroughlines ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    const slug = entry.slug?.trim()
    const text = entry.text?.trim()
    if (!slug || !text) continue
    if (!entryLinksArtwork(entry.linkedArtworkSlugs, artwork)) continue
    out.push({
      name: text.slice(0, 120),
      url: `${origin}/statement/throughlines/${slug}`,
    })
  }

  return out
}

/**
 * Live reverse lookup: public bio timeline entries whose linkedArtworkSlugs
 * include this artwork.
 */
export function findRelatedBioEvents(
  artist: Artist | null | undefined,
  artwork: Pick<Artwork, 'id' | 'slug'>,
  baseUrl: string = CORPUS_BASE,
): ReciprocalLink[] {
  if (!artist) return []
  const origin = baseUrl.replace(/\/$/, '')
  const out: ReciprocalLink[] = []

  for (const entry of artist.bioTimelineEntries ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    const slug = entry.slug?.trim()
    const text = entry.text?.trim()
    if (!slug || !text) continue
    if (!entryLinksArtwork(entry.linkedArtworkSlugs, artwork)) continue
    out.push({
      name: text.slice(0, 120),
      url: `${origin}/bio/entries/${slug}`,
    })
  }

  return out
}

/** Tier 1 drill-down signal — true when either reverse lookup has hits. */
export function artworkHasThroughlineConnections(
  artist: Artist | null | undefined,
  artwork: Pick<Artwork, 'id' | 'slug'>,
): boolean {
  if (!artist) return false
  for (const entry of artist.statementThroughlines ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    if (!entry.slug?.trim() || !entry.text?.trim()) continue
    if (entryLinksArtwork(entry.linkedArtworkSlugs, artwork)) return true
  }
  for (const entry of artist.bioTimelineEntries ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    if (!entry.slug?.trim() || !entry.text?.trim()) continue
    if (entryLinksArtwork(entry.linkedArtworkSlugs, artwork)) return true
  }
  return false
}

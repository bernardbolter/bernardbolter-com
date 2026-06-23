import type { Artwork } from '@/payload-types'

export const RELATED_WORK_TYPE_LABELS: Record<string, string> = {
  'derivative-oil-painting': 'oil painting interpretation',
  'derivative-other': 'related work in another medium',
  'series-related': 'related composition in the same series',
  other: 'related work',
}

export type PublicRelatedWork = {
  relationshipLabel: string
  note: string | null
  href: string | null
  linkLabel: string | null
}

function readRelatedArtwork(
  value: NonNullable<Artwork['relatedWorks']>[number]['relatedArtwork'],
): { slug: string; title: string } | null {
  if (!value || typeof value === 'number') return null
  const slug = typeof value.slug === 'string' ? value.slug.trim() : ''
  if (!slug) return null
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  return { slug, title: title || slug }
}

export function getPublicRelatedWorks(artwork: Artwork): PublicRelatedWork[] {
  const rows = artwork.relatedWorks
  if (!Array.isArray(rows)) return []

  const results: PublicRelatedWork[] = []

  for (const row of rows) {
    if (!row) continue

    const relationshipType = row.relationshipType ?? 'other'
    const relationshipLabel =
      RELATED_WORK_TYPE_LABELS[relationshipType] ?? RELATED_WORK_TYPE_LABELS.other
    const note = row.relatedWorkNote?.trim() || null
    const linked = readRelatedArtwork(row.relatedArtwork)

    if (!note && !linked) continue

    results.push({
      relationshipLabel,
      note,
      href: linked ? `/${linked.slug}` : null,
      linkLabel: linked?.title ?? null,
    })
  }

  return results
}

export type JsonLdRelatedWork = {
  relationshipType: string
  description: string
  url?: string
}

export function buildJsonLdRelatedWorks(
  artwork: Artwork,
  baseUrl: string,
): JsonLdRelatedWork[] | undefined {
  const rows = artwork.relatedWorks
  if (!Array.isArray(rows) || rows.length === 0) return undefined

  const results: JsonLdRelatedWork[] = []

  for (const row of rows) {
    if (!row) continue

    const relationshipType = row.relationshipType ?? 'other'
    const note = row.relatedWorkNote?.trim()
    const linked = readRelatedArtwork(row.relatedArtwork)
    if (!note && !linked) continue

    const item: JsonLdRelatedWork = {
      relationshipType,
      description:
        note ??
        `A related ${RELATED_WORK_TYPE_LABELS[relationshipType] ?? RELATED_WORK_TYPE_LABELS.other} exists — catalogued independently of this work.`,
    }

    if (linked) {
      item.url = `${baseUrl.replace(/\/$/, '')}/${linked.slug}`
    }

    results.push(item)
  }

  return results.length > 0 ? results : undefined
}

export function formatRelatedWorkLine(item: PublicRelatedWork): string {
  const lead = `A related ${item.relationshipLabel} exists`
  if (item.href && item.linkLabel) {
    return `${lead} — ${item.linkLabel}.`
  }
  if (item.note) return `${lead} — ${item.note}`
  return `${lead}.`
}

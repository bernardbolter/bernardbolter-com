import type { CollectionBeforeChangeHook } from 'payload'
import { randomBytes } from 'crypto'

import {
  mergeLocationRows,
  validateContactLocations,
} from '@/lib/artist/validateContactLocations'
import { slugifyArtworkTitle } from '@/lib/artOfficial/quickUploadDerived'
import { getSiteBaseUrl } from '@/lib/jsonld/site'

type SlugRow = { slug?: string | null; text?: string | null; id?: string | null }

function uniqueSlug(base: string, used: Set<string>): string {
  let candidate = base || 'entry'
  if (!used.has(candidate)) {
    used.add(candidate)
    return candidate
  }
  for (let i = 0; i < 8; i += 1) {
    const suffix = randomBytes(2).toString('hex')
    candidate = `${base}-${suffix}`
    if (!used.has(candidate)) {
      used.add(candidate)
      return candidate
    }
  }
  candidate = `${base}-${Date.now().toString(36)}`
  used.add(candidate)
  return candidate
}

function ensureEntrySlugs(
  rows: SlugRow[] | null | undefined,
  originalRows: SlugRow[] | null | undefined,
  used: Set<string>,
): void {
  if (!Array.isArray(rows)) return
  const byId = new Map<string, string>()
  for (const row of originalRows ?? []) {
    if (row?.id && row.slug?.trim()) byId.set(row.id, row.slug.trim())
  }
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    if ((!row.slug || !row.slug.trim()) && row.id && byId.has(row.id)) {
      row.slug = byId.get(row.id)!
    }
    if (typeof row.slug === 'string' && row.slug.trim()) {
      used.add(row.slug.trim())
      continue
    }
    const base = slugifyArtworkTitle(row.text?.trim() || row.id || 'entry')
    row.slug = uniqueSlug(base, used)
  }
}

export const artistBeforeChange: CollectionBeforeChangeHook = ({ data, originalDoc, operation }) => {
  const d = data as Record<string, unknown>
  if (!d.canonicalDomain || (typeof d.canonicalDomain === 'string' && !d.canonicalDomain.trim())) {
    d.canonicalDomain = getSiteBaseUrl()
  }

  if (operation === 'create' || operation === 'update') {
    const locations = mergeLocationRows(d.locations, originalDoc?.locations)
    validateContactLocations(locations)

    const used = new Set<string>()
    for (const row of (originalDoc?.bioTimelineEntries ?? []) as SlugRow[]) {
      if (row?.slug?.trim()) used.add(row.slug.trim())
    }
    for (const row of (originalDoc?.statementThroughlines ?? []) as SlugRow[]) {
      if (row?.slug?.trim()) used.add(row.slug.trim())
    }
    ensureEntrySlugs(
      d.bioTimelineEntries as SlugRow[] | undefined,
      originalDoc?.bioTimelineEntries as SlugRow[] | undefined,
      used,
    )
    ensureEntrySlugs(
      d.statementThroughlines as SlugRow[] | undefined,
      originalDoc?.statementThroughlines as SlugRow[] | undefined,
      used,
    )
  }

  return data
}

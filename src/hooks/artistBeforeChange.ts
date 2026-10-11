import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import {
  ENTRY_SLUG_MAX_LENGTH,
  slugifyEntryText,
  uniqueEntrySlug,
} from '@/lib/artist/entrySlug'
import {
  mergeLocationRows,
  validateContactLocations,
} from '@/lib/artist/validateContactLocations'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { bioEntryPublicPath, throughlinePublicPath } from '@/lib/redirects/paths'
import { recordSlugRedirect } from '@/lib/redirects/recordSlugRedirect'

type SlugRow = { slug?: string | null; text?: string | null; id?: string | null }

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
    const current = typeof row.slug === 'string' ? row.slug.trim() : ''
    // Sticky when present and within the 60-char cap; regenerate over-length.
    if (current && current.length <= ENTRY_SLUG_MAX_LENGTH) {
      used.add(current)
      continue
    }
    const base = slugifyEntryText(row.text?.trim() || row.id || 'entry')
    row.slug = uniqueEntrySlug(base, used)
  }
}

async function recordEntrySlugRedirects(
  req: PayloadRequest | undefined,
  rows: SlugRow[] | null | undefined,
  originalRows: SlugRow[] | null | undefined,
  kind: 'throughline' | 'bio-entry',
): Promise<void> {
  if (!req?.payload || !Array.isArray(rows)) return
  const byId = new Map<string, string>()
  for (const row of originalRows ?? []) {
    if (row?.id && row.slug?.trim()) byId.set(row.id, row.slug.trim())
  }
  const pathFor = kind === 'throughline' ? throughlinePublicPath : bioEntryPublicPath
  for (const row of rows) {
    if (!row?.id || !row.slug?.trim()) continue
    const prev = byId.get(row.id)
    const next = row.slug.trim()
    if (!prev || prev === next) continue
    await recordSlugRedirect(req.payload, {
      fromPath: pathFor(prev),
      toPath: pathFor(next),
      source: kind,
      req,
    })
  }
}

export const artistBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
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

    if (operation === 'update') {
      await recordEntrySlugRedirects(
        req,
        d.bioTimelineEntries as SlugRow[] | undefined,
        originalDoc?.bioTimelineEntries as SlugRow[] | undefined,
        'bio-entry',
      )
      await recordEntrySlugRedirects(
        req,
        d.statementThroughlines as SlugRow[] | undefined,
        originalDoc?.statementThroughlines as SlugRow[] | undefined,
        'throughline',
      )
    }
  }

  return data
}

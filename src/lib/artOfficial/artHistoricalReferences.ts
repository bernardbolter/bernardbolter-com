import type { Payload } from 'payload'

import type { User } from '@/payload-types'

type ResolveContext = {
  payload: Payload
  user: User
}

export type ArtHistoricalReferenceStagingEntry = {
  name: string
  matchStrategy?: string
  relevanceNote?: string
}

/**
 * Structural guard for update_field / envelope staging.
 * Rejects prose strings (Brandenburger Tor bug); only arrays are valid.
 */
export function validateArtHistoricalReferencesValue(
  value: unknown,
): { ok: true } | { ok: false; error: string } {
  if (typeof value === 'string') {
    return {
      ok: false,
      error:
        'artHistoricalReferences must be a structured array, not prose. Put art-historical prose in artHistoricalContext. Stage references as [{ name, matchStrategy: "fuzzy-match-or-create", relevanceNote? }].',
    }
  }
  if (!Array.isArray(value)) {
    return {
      ok: false,
      error:
        'artHistoricalReferences must be an array of { name, matchStrategy?, relevanceNote? } objects (or numeric ids).',
    }
  }

  for (let i = 0; i < value.length; i++) {
    const item = value[i]
    if (typeof item === 'number' && Number.isFinite(item)) continue
    if (typeof item === 'string') {
      const trimmed = item.trim()
      if (!trimmed) {
        return { ok: false, error: `artHistoricalReferences[${i}] is an empty string.` }
      }
      // Bare name labels are allowed; long prose paragraphs are not.
      if (trimmed.length > 80) {
        return {
          ok: false,
          error: `artHistoricalReferences[${i}] looks like prose. Use { name: "…", matchStrategy: "fuzzy-match-or-create", relevanceNote?: "…" } and put extended prose in artHistoricalContext.`,
        }
      }
      continue
    }
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>
      if (typeof row.id === 'number' && Number.isFinite(row.id)) continue
      const name = typeof row.name === 'string' ? row.name.trim() : ''
      if (!name) {
        return {
          ok: false,
          error: `artHistoricalReferences[${i}] needs a non-empty "name" (or numeric id).`,
        }
      }
      continue
    }
    return {
      ok: false,
      error: `artHistoricalReferences[${i}] must be a name string, numeric id, or { name, matchStrategy?, relevanceNote? }.`,
    }
  }

  return { ok: true }
}

function normalizePersonName(name: string): string {
  let s = name
    .trim()
    .toLowerCase()
    .replace(/[.“”"']/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // "rauschenberg robert" from "Rauschenberg, Robert"
  if (name.includes(',')) {
    const [last, ...rest] = name
      .split(',')
      .map((p) =>
        p
          .trim()
          .toLowerCase()
          .replace(/[.“”"']/g, '')
          .replace(/[.,]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(Boolean)
    if (last && rest.length) s = [...rest, last].join(' ')
  }
  return s
}

function lastName(normalized: string): string {
  const parts = normalized.split(' ').filter(Boolean)
  return parts[parts.length - 1] ?? normalized
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizePersonName(a)
  const nb = normalizePersonName(b)
  if (!na || !nb) return false
  if (na === nb) return true

  const la = lastName(na)
  const lb = lastName(nb)
  // "Rauschenberg" ↔ "Robert Rauschenberg"
  if (na === lb || nb === la) return true
  if (la === lb && (na.includes(nb) || nb.includes(na))) return true
  return false
}

function parseStagingEntry(item: unknown): ArtHistoricalReferenceStagingEntry | number | null {
  if (typeof item === 'number' && Number.isFinite(item)) return item
  if (typeof item === 'string') {
    const trimmed = item.trim()
    if (!trimmed) return null
    if (/^\d+$/.test(trimmed)) return Number(trimmed)
    return { name: trimmed, matchStrategy: 'fuzzy-match-or-create' }
  }
  if (item && typeof item === 'object') {
    const row = item as Record<string, unknown>
    if (typeof row.id === 'number' && Number.isFinite(row.id)) return row.id
    if (typeof row.id === 'string' && /^\d+$/.test(row.id.trim())) return Number(row.id.trim())
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    if (!name) return null
    return {
      name,
      matchStrategy:
        typeof row.matchStrategy === 'string' ? row.matchStrategy : 'fuzzy-match-or-create',
      relevanceNote:
        typeof row.relevanceNote === 'string' && row.relevanceNote.trim()
          ? row.relevanceNote.trim()
          : undefined,
    }
  }
  return null
}

async function findExistingReferenceId(
  ctx: ResolveContext,
  name: string,
): Promise<number | null> {
  const needle = name.trim()
  if (!needle) return null

  const last = lastName(normalizePersonName(needle))
  const res = await ctx.payload.find({
    collection: 'art-historical-references',
    where: {
      or: [
        { artistName: { equals: needle } },
        { artistName: { contains: last } },
        { artworkTitle: { equals: needle } },
        { artworkTitle: { contains: last } },
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  })

  for (const doc of res.docs) {
    const artistName = typeof doc.artistName === 'string' ? doc.artistName : ''
    const artworkTitle = typeof doc.artworkTitle === 'string' ? doc.artworkTitle : ''
    if (namesMatch(needle, artistName) || namesMatch(needle, artworkTitle)) {
      return typeof doc.id === 'number' ? doc.id : null
    }
  }
  return null
}

async function createPendingReference(
  ctx: ResolveContext,
  name: string,
  relevanceNote?: string,
): Promise<number | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  try {
    const created = await ctx.payload.create({
      collection: 'art-historical-references',
      data: {
        // Artist-level stub until the artist confirms a specific work title/spelling.
        artworkTitle: trimmed,
        artistName: trimmed,
        needsArtistReview: true,
        notes: relevanceNote ?? undefined,
      },
      overrideAccess: false,
      user: ctx.user,
    })
    return typeof created.id === 'number' ? created.id : null
  } catch {
    return findExistingReferenceId(ctx, trimmed)
  }
}

function buildContextFromRelevanceNotes(
  entries: ArtHistoricalReferenceStagingEntry[],
): string | null {
  const lines = entries
    .filter((e) => e.relevanceNote)
    .map((e) => `${e.name} — ${e.relevanceNote}`)
  return lines.length ? lines.join('\n\n') : null
}

/**
 * Resolve staged artHistoricalReferences to relationship ids.
 * Fuzzy-matches existing records by artist/title name; creates needsArtistReview stubs otherwise.
 * When relevanceNotes are present and artHistoricalContext is empty, fills context from those notes
 * (schema has no per-link annotation on the relationship field).
 */
export async function resolveArtHistoricalReferencesField(
  ctx: ResolveContext,
  patch: Record<string, unknown>,
): Promise<void> {
  const value = patch.artHistoricalReferences
  if (value == null) return
  if (typeof value === 'string') {
    delete patch.artHistoricalReferences
    return
  }
  if (!Array.isArray(value)) {
    delete patch.artHistoricalReferences
    return
  }

  const ids: number[] = []
  const namedEntries: ArtHistoricalReferenceStagingEntry[] = []
  const seen = new Set<number>()

  for (const item of value) {
    const parsed = parseStagingEntry(item)
    if (parsed == null) continue

    if (typeof parsed === 'number') {
      if (!seen.has(parsed)) {
        seen.add(parsed)
        ids.push(parsed)
      }
      continue
    }

    namedEntries.push(parsed)
    const existing = await findExistingReferenceId(ctx, parsed.name)
    const id =
      existing ??
      (await createPendingReference(ctx, parsed.name, parsed.relevanceNote))
    if (id != null && !seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }

  if (ids.length) patch.artHistoricalReferences = ids
  else delete patch.artHistoricalReferences

  const existingContext =
    typeof patch.artHistoricalContext === 'string' ? patch.artHistoricalContext.trim() : ''
  if (!existingContext) {
    const synthesized = buildContextFromRelevanceNotes(namedEntries)
    if (synthesized) patch.artHistoricalContext = synthesized
  }
}

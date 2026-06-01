import type { Payload } from 'payload'

import type { User } from '@/payload-types'

type SeriesLookupContext = {
  payload: Payload
  user: User
}

export type SeriesRecord = {
  id: number
  slug: string
  parentSeriesId?: number | null
}

export async function listSeriesSlugs(ctx: SeriesLookupContext): Promise<string[]> {
  const records = await listSeriesWithParents(ctx)
  return records.map((r) => r.slug)
}

export async function listSeriesWithParents(ctx: SeriesLookupContext): Promise<SeriesRecord[]> {
  const res = await ctx.payload.find({
    collection: 'series',
    limit: 100,
    depth: 0,
    sort: 'slug',
    overrideAccess: false,
    user: ctx.user,
  })
  return res.docs
    .filter((doc) => typeof doc.slug === 'string' && doc.slug.trim())
    .map((doc) => ({
      id: doc.id,
      slug: (doc.slug as string).trim(),
      parentSeriesId:
        typeof (doc as { parentSeries?: unknown }).parentSeries === 'number'
          ? ((doc as { parentSeries?: unknown }).parentSeries as number)
          : null,
    }))
}

/** Walk the parent chain to test whether a slug descends from the given ancestor slug. */
export function isSlugDescendantOf(
  records: SeriesRecord[],
  slug: string,
  ancestorSlug: string,
): boolean {
  if (slug === ancestorSlug) return true
  const idBySlug = new Map(records.map((r) => [r.slug, r.id]))
  const parentById = new Map(
    records.filter((r) => r.parentSeriesId != null).map((r) => [r.id, r.parentSeriesId!]),
  )
  const ancestorId = idBySlug.get(ancestorSlug)
  if (ancestorId == null) return false

  let current = idBySlug.get(slug)
  const visited = new Set<number>()
  while (current != null && !visited.has(current)) {
    visited.add(current)
    const parent = parentById.get(current)
    if (parent === ancestorId) return true
    current = parent
  }
  return false
}

export async function findSeriesIdBySlug(
  ctx: SeriesLookupContext,
  slug: string,
): Promise<number | null> {
  const trimmed = slug.trim()
  if (!trimmed) return null
  const res = await ctx.payload.find({
    collection: 'series',
    where: { slug: { equals: trimmed } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  })
  const id = res.docs[0]?.id
  return typeof id === 'number' ? id : null
}

function formatSeriesSlugList(slugs: string[]): string {
  if (slugs.length === 0) {
    return 'No series records found — create one in Series admin or run `pnpm tsx src/scripts/seed-series.ts`.'
  }
  return slugs.map((s) => `- ${s}`).join('\n')
}

/** Reject invented slugs when the agent stages `series` on artworks. */
export async function assertArtworkSeriesSlugExists(
  ctx: SeriesLookupContext,
  value: unknown,
): Promise<void> {
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (typeof value !== 'string') return
  const trimmed = value.trim()
  if (!trimmed || /^\d+$/.test(trimmed)) return

  const id = await findSeriesIdBySlug(ctx, trimmed)
  if (id != null) return

  const slugs = await listSeriesSlugs(ctx)
  throw new Error(
    `Series slug "${trimmed}" does not exist. Stage \`series\` with an exact Payload slug, not a title or keyword. Known slugs:\n${formatSeriesSlugList(slugs)}`,
  )
}

export async function seriesNotFoundMessage(
  ctx: SeriesLookupContext,
  slug: string,
): Promise<string> {
  const slugs = await listSeriesSlugs(ctx)
  return `Series "${slug}" was not found. Create it in Series admin or stage \`series\` with a valid slug:\n${formatSeriesSlugList(slugs)}`
}

export function buildSeriesSlugPromptBlock(records: SeriesRecord[]): string {
  if (records.length === 0) {
    return `VALID SERIES SLUGS

No series records in Payload yet. Run seed-series or create Series in admin before staging \`series\`.`
  }

  const idBySlug = new Map(records.map((r) => [r.slug, r.id]))
  const slugById = new Map(records.map((r) => [r.id, r.slug]))

  const lines = records.map((r) => {
    if (r.parentSeriesId != null) {
      const parentSlug = slugById.get(r.parentSeriesId) ?? `id:${r.parentSeriesId}`
      return `- ${r.slug}  (sub-series of ${parentSlug})`
    }
    return `- ${r.slug}`
  })

  // Find all slugs that descend from a-colorful-history
  const achDescendants = records
    .filter((r) => r.slug !== 'a-colorful-history' && isSlugDescendantOf(records, r.slug, 'a-colorful-history'))
    .map((r) => r.slug)

  const achNote =
    achDescendants.length > 0
      ? `\nACH sub-series (full ACH workflow applies): ${achDescendants.join(', ')}`
      : ''

  void idBySlug

  return `VALID SERIES SLUGS (for update_field field "series" — use slug exactly, never a title)

${lines.join('\n')}${achNote}

Stage the exact slug from the list above. Sub-series noted above are part of a parent series; use the sub-series slug (e.g. \`gates-of-perception\`) when that is the correct series for the artwork.`
}

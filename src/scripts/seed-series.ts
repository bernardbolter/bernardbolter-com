/**
 * Idempotent seed for `series` (run with `pnpm tsx src/scripts/seed-series.ts`).
 *
 * Creates practice series slugs used by the frontend helpers and Art/Official.
 */
import { getPayload } from 'payload'

import config from '@payload-config'

const ROWS: Array<{
  slug: string
  nameEn: string
  nameDe?: string
  status?: 'draft' | 'published'
  /** Omit = leave parent unchanged on update. `null` = top-level series. */
  parentSeriesSlug?: string | null
}> = [
  { slug: 'a-colorful-history', nameEn: 'A Colorful History', nameDe: 'A Colorful History', status: 'published', parentSeriesSlug: null },
  { slug: 'mediums-of-perception', nameEn: 'Mediums of Perception', nameDe: 'Mediums of Perception', status: 'published', parentSeriesSlug: 'a-colorful-history' },
  { slug: 'mediums-of-war', nameEn: 'Mediums of War', nameDe: 'Mediums of War', status: 'published', parentSeriesSlug: 'a-colorful-history' },
  { slug: 'gates-of-perception', nameEn: 'Gates of Perception', nameDe: 'Gates of Perception', status: 'published', parentSeriesSlug: 'a-colorful-history' },
  { slug: 'art-collision', nameEn: 'Art Collision', nameDe: 'Art Collision', parentSeriesSlug: null },
  { slug: 'digital-city-series', nameEn: 'Digital City Series', nameDe: 'Digital City Series', parentSeriesSlug: null },
  { slug: 'megacities', nameEn: 'Megacities', nameDe: 'Megacities', parentSeriesSlug: null },
  { slug: 'breaking-down-art', nameEn: 'Breaking Down Art', nameDe: 'Breaking Down Art', status: 'published', parentSeriesSlug: null },
  { slug: 'vanishing-landscapes', nameEn: 'Vanishing Landscapes', nameDe: 'Vanishing Landscapes', parentSeriesSlug: null },
  { slug: 'og-oil-paintings', nameEn: 'OG Oil Paintings', nameDe: 'OG Oil Paintings', parentSeriesSlug: null },
  { slug: 'installations', nameEn: 'Installations', nameDe: 'Installationen', parentSeriesSlug: null },
  { slug: 'photography', nameEn: 'Photography', nameDe: 'Fotografie', parentSeriesSlug: null },
  { slug: 'videos', nameEn: 'Videos', nameDe: 'Videos', parentSeriesSlug: null },
]

async function resolveParentSeriesId(
  payload: Awaited<ReturnType<typeof getPayload>>,
  parentSeriesSlug: string | null | undefined,
): Promise<number | null | undefined> {
  if (parentSeriesSlug === undefined) return undefined
  if (parentSeriesSlug === null) return null
  const parent = await payload.find({
    collection: 'series',
    where: { slug: { equals: parentSeriesSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const id = parent.docs[0]?.id
  if (!id) {
    throw new Error(`Parent series not found: ${parentSeriesSlug}`)
  }
  return Number(id)
}

async function main() {
  const payload = await getPayload({ config })
  for (const row of ROWS) {
    const parentSeriesId = await resolveParentSeriesId(payload, row.parentSeriesSlug)
    const existing = await payload.find({
      collection: 'series',
      where: { slug: { equals: row.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      const doc = existing.docs[0]
      const updates: Record<string, unknown> = {}
      if (parentSeriesId !== undefined) {
        const currentParent =
          typeof doc.parentSeries === 'number' ? doc.parentSeries : doc.parentSeries ?? null
        if (currentParent !== parentSeriesId) {
          updates.parentSeries = parentSeriesId
        }
      }
      if (row.status && doc.status !== row.status) {
        updates.status = row.status
      }
      if (Object.keys(updates).length) {
        await payload.update({
          collection: 'series',
          id: doc.id,
          data: updates,
          overrideAccess: true,
        })
        console.log('updated', row.slug, updates)
      } else {
        console.log('skip', row.slug, `(id ${doc.id})`)
      }
      continue
    }
    const created = await payload.create({
      collection: 'series',
      locale: 'en',
      data: {
        name: row.nameEn,
        slug: row.slug,
        status: row.status ?? 'published',
        ...(parentSeriesId !== undefined ? { parentSeries: parentSeriesId } : {}),
      },
      overrideAccess: true,
    })
    if (row.nameDe) {
      await payload.update({
        collection: 'series',
        id: created.id,
        locale: 'de',
        data: { name: row.nameDe },
        overrideAccess: true,
      })
    }
    console.log('created', row.slug, `(id ${created.id})`)
  }
  console.log('done')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

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
}> = [
  { slug: 'a-colorful-history', nameEn: 'A Colorful History', nameDe: 'A Colorful History', status: 'published' },
  { slug: 'mediums-of-perception', nameEn: 'Mediums of Perception', nameDe: 'Mediums of Perception', status: 'published' },
  { slug: 'mediums-of-war', nameEn: 'Mediums of War', nameDe: 'Mediums of War', status: 'published' },
  { slug: 'art-collision', nameEn: 'Art Collision', nameDe: 'Art Collision' },
  { slug: 'digital-city-series', nameEn: 'Digital City Series', nameDe: 'Digital City Series' },
  { slug: 'megacities', nameEn: 'Megacities', nameDe: 'Megacities' },
  { slug: 'breaking-down-art', nameEn: 'Breaking Down Art', nameDe: 'Breaking Down Art' },
  { slug: 'vanishing-landscapes', nameEn: 'Vanishing Landscapes', nameDe: 'Vanishing Landscapes' },
  { slug: 'og-oil-paintings', nameEn: 'OG Oil Paintings', nameDe: 'OG Oil Paintings' },
  { slug: 'installations', nameEn: 'Installations', nameDe: 'Installationen' },
  { slug: 'photography', nameEn: 'Photography', nameDe: 'Fotografie' },
  { slug: 'videos', nameEn: 'Videos', nameDe: 'Videos' },
]

async function main() {
  const payload = await getPayload({ config })
  for (const row of ROWS) {
    const existing = await payload.find({
      collection: 'series',
      where: { slug: { equals: row.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      console.log('skip', row.slug, `(id ${existing.docs[0].id})`)
      continue
    }
    const created = await payload.create({
      collection: 'series',
      locale: 'en',
      data: {
        name: row.nameEn,
        slug: row.slug,
        status: row.status ?? 'published',
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

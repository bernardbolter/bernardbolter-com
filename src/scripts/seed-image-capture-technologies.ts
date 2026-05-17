/**
 * Idempotent seed for `image-capture-technologies` (run with
 * `pnpm tsx src/scripts/seed-image-capture-technologies.ts`).
 *
 * Seeds the starter vocabulary from handoff-ach-schema-extension.md Part 1.2.
 * Stubs `name` + `slug` only; richer description / Wikidata can be added by
 * Art/Official or in the admin.
 */
import { getPayload } from 'payload'

import config from '@payload-config'

const ROWS: Array<{
  slug: string
  nameEn: string
  nameDe?: string
  approximatePeriodStart?: number
  approximatePeriodEnd?: number | null
  wikidataUri?: string
}> = [
  {
    slug: 'daguerreotype',
    nameEn: 'Daguerreotype',
    nameDe: 'Daguerreotypie',
    approximatePeriodStart: 1839,
    approximatePeriodEnd: 1860,
    wikidataUri: 'https://www.wikidata.org/entity/Q178227',
  },
  {
    slug: 'ambrotype',
    nameEn: 'Ambrotype',
    nameDe: 'Ambrotypie',
    approximatePeriodStart: 1851,
    approximatePeriodEnd: 1875,
    wikidataUri: 'https://www.wikidata.org/entity/Q193760',
  },
  {
    slug: 'wet-plate-collodion',
    nameEn: 'Wet plate collodion',
    nameDe: 'Kollodium-Nassplatte',
    approximatePeriodStart: 1851,
    approximatePeriodEnd: 1880,
    wikidataUri: 'https://www.wikidata.org/entity/Q1145595',
  },
  {
    slug: 'dry-plate',
    nameEn: 'Dry plate',
    nameDe: 'Trockenplatte',
    approximatePeriodStart: 1871,
    approximatePeriodEnd: 1925,
    wikidataUri: 'https://www.wikidata.org/entity/Q1233188',
  },
  {
    slug: 'glass-plate',
    nameEn: 'Glass plate',
    nameDe: 'Glasplatte',
    approximatePeriodStart: 1851,
    approximatePeriodEnd: 1925,
  },
  {
    slug: 'lithograph',
    nameEn: 'Lithograph',
    nameDe: 'Lithografie',
    approximatePeriodStart: 1796,
    approximatePeriodEnd: null,
    wikidataUri: 'https://www.wikidata.org/entity/Q133036',
  },
  {
    slug: 'engraving',
    nameEn: 'Engraving',
    nameDe: 'Kupferstich',
    approximatePeriodStart: 1430,
    approximatePeriodEnd: null,
    wikidataUri: 'https://www.wikidata.org/entity/Q11835431',
  },
  {
    slug: 'woodblock-print',
    nameEn: 'Woodblock print',
    nameDe: 'Holzschnitt',
    approximatePeriodStart: 700,
    approximatePeriodEnd: null,
    wikidataUri: 'https://www.wikidata.org/entity/Q18217',
  },
  {
    slug: 'early-aerial',
    nameEn: 'Early aerial photograph',
    nameDe: 'Frühe Luftaufnahme',
    approximatePeriodStart: 1858,
    approximatePeriodEnd: 1945,
    wikidataUri: 'https://www.wikidata.org/entity/Q4694996',
  },
  {
    slug: 'satellite',
    nameEn: 'Satellite imagery',
    nameDe: 'Satellitenbild',
    approximatePeriodStart: 1959,
    approximatePeriodEnd: null,
    wikidataUri: 'https://www.wikidata.org/entity/Q725252',
  },
  {
    slug: 'digital-photograph',
    nameEn: 'Digital photograph',
    nameDe: 'Digitalfotografie',
    approximatePeriodStart: 1975,
    approximatePeriodEnd: null,
    wikidataUri: 'https://www.wikidata.org/entity/Q199663',
  },
]

async function main() {
  const payload = await getPayload({ config })
  for (const row of ROWS) {
    const existing = await payload.find({
      collection: 'image-capture-technologies',
      where: { slug: { equals: row.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      console.log('skip', row.slug)
      continue
    }
    const created = await payload.create({
      collection: 'image-capture-technologies',
      locale: 'en',
      data: {
        name: row.nameEn,
        slug: row.slug,
        approximatePeriodStart: row.approximatePeriodStart ?? null,
        approximatePeriodEnd: row.approximatePeriodEnd ?? null,
        wikidataUri: row.wikidataUri ?? null,
      },
      overrideAccess: true,
    })
    if (row.nameDe) {
      await payload.update({
        collection: 'image-capture-technologies',
        id: created.id,
        locale: 'de',
        data: { name: row.nameDe },
        overrideAccess: true,
      })
    }
    console.log('created', row.slug)
  }
  console.log('done')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

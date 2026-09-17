/**
 * Idempotent seed for `image-capture-technologies` (run with
 * `pnpm tsx src/scripts/seed-image-capture-technologies.ts`).
 *
 * Seeds the starter vocabulary from handoff-ach-schema-extension.md Part 1.2.
 * Stubs `name` + `slug` (and draft descriptions for the two MoW vocab rows).
 * Richer description / Wikidata can be added by Art/Official or in the admin.
 */
import { getPayload } from 'payload'

import config from '@payload-config'

function lexicalParagraph(text: string) {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text, version: 1 }],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
        },
      ],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

const ROWS: Array<{
  slug: string
  nameEn: string
  nameDe?: string
  approximatePeriodStart?: number
  approximatePeriodEnd?: number | null
  wikidataUri?: string
  descriptionEn?: string
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
  {
    slug: 'color-photograph',
    nameEn: 'Color photograph',
    nameDe: 'Farbfotografie',
    approximatePeriodStart: 1935,
    approximatePeriodEnd: null,
    wikidataUri: 'https://www.wikidata.org/entity/Q182167',
    descriptionEn:
      '[DRAFT — Bernard to confirm] Color still photography as a mass medium, dated from Kodachrome (1935). Placeholder for WWII-era color source images in Mediums of War panel II — not a finished technology note.',
  },
  {
    // Vietnam-era moving-image sources mixed 16mm news film and television video;
    // this slug names both rather than guessing which one Bernard intends.
    slug: 'video-16mm-film',
    nameEn: 'Video / 16mm film',
    nameDe: 'Video / 16-mm-Film',
    approximatePeriodStart: 1965,
    approximatePeriodEnd: null,
    wikidataUri: 'https://www.wikidata.org/entity/Q151342',
    descriptionEn:
      '[DRAFT — Bernard to confirm] Moving-image capture of the Vietnam War era: 16mm film and contemporaneous video/television. Placeholder for Mediums of War panel III — not a finished technology note.',
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
        ...(row.descriptionEn ? { description: lexicalParagraph(row.descriptionEn) } : {}),
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

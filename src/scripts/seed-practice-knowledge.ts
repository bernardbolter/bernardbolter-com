/**
 * Idempotent seed for `practice-knowledge` slugs (run with `pnpm tsx src/scripts/seed-practice-knowledge.ts`).
 */
import { getPayload } from 'payload'

import config from '@payload-config'

const ROWS: Array<{ slug: string; sectionLabel: string; order: number }> = [
  { slug: 'biography', sectionLabel: 'Biography', order: 10 },
  { slug: 'artist-statement', sectionLabel: 'Artist statement', order: 20 },
  { slug: 'series', sectionLabel: 'Series', order: 30 },
  { slug: 'visual-vocabulary', sectionLabel: 'Visual vocabulary', order: 40 },
  { slug: 'art-historical-touchstones', sectionLabel: 'Art historical touchstones', order: 50 },
  { slug: 'preferred-vocabulary', sectionLabel: 'Preferred vocabulary', order: 60 },
]

async function main() {
  const payload = await getPayload({ config })
  for (const row of ROWS) {
    const existing = await payload.find({
      collection: 'practice-knowledge',
      where: { slug: { equals: row.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      console.log('skip', row.slug)
      continue
    }
    await payload.create({
      collection: 'practice-knowledge',
      data: {
        slug: row.slug,
        sectionLabel: row.sectionLabel,
        order: row.order,
        status: 'active',
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: `Placeholder for ${row.slug}. Edit in admin.` }],
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
      },
      overrideAccess: true,
    })
    console.log('created', row.slug)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

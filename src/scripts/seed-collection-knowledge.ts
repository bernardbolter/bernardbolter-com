import { getPayload } from 'payload'

import config from '@payload-config'

const ROWS: Array<{ slug: string; sectionLabel: string; order: number }> = [
  { slug: 'collector-biography', sectionLabel: 'COLLECTION KNOWLEDGE — COLLECTOR', order: 10 },
  { slug: 'collection-focus', sectionLabel: 'COLLECTION KNOWLEDGE — FOCUS', order: 20 },
  { slug: 'dealer-relationships', sectionLabel: 'COLLECTION KNOWLEDGE — DEALERS', order: 30 },
  { slug: 'acquisition-context', sectionLabel: 'COLLECTION KNOWLEDGE — ACQUISITION', order: 40 },
  { slug: 'collection-overview', sectionLabel: 'COLLECTION KNOWLEDGE — OVERVIEW', order: 50 },
]

const placeholderLexical = (slug: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: `Placeholder for ${slug}.` }],
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
})

async function main() {
  const payload = await getPayload({ config })
  for (const row of ROWS) {
    const existing = await payload.find({
      collection: 'collection-knowledge',
      where: { slug: { equals: row.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      console.log('skip', row.slug)
      continue
    }
    await payload.create({
      collection: 'collection-knowledge',
      data: {
        slug: row.slug,
        sectionLabel: row.sectionLabel,
        order: row.order,
        status: 'active',
        content: placeholderLexical(row.slug),
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

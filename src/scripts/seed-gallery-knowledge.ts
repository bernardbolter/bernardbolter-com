import { getPayload } from 'payload'

import config from '@payload-config'

const ROWS: Array<{ slug: string; sectionLabel: string; order: number }> = [
  { slug: 'gallery-biography', sectionLabel: 'GALLERY KNOWLEDGE — BIOGRAPHY', order: 10 },
  { slug: 'programme-focus', sectionLabel: 'GALLERY KNOWLEDGE — PROGRAMME', order: 20 },
  { slug: 'represented-artists', sectionLabel: 'GALLERY KNOWLEDGE — ARTISTS', order: 30 },
  { slug: 'exhibition-history', sectionLabel: 'GALLERY KNOWLEDGE — EXHIBITIONS', order: 40 },
  { slug: 'curatorial-position', sectionLabel: 'GALLERY KNOWLEDGE — CURATORIAL', order: 50 },
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
      collection: 'gallery-knowledge',
      where: { slug: { equals: row.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      console.log('skip', row.slug)
      continue
    }
    await payload.create({
      collection: 'gallery-knowledge',
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

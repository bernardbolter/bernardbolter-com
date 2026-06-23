import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

async function main() {
  const payload = await getPayload({ config })
  for (const slug of ['basel-switzerland', 'stockholm-sweden', '__fixture-basel-dcs']) {
    const { docs } = await payload.find({
      collection: 'artworks',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    })
    const a = docs[0]
    if (!a) {
      console.log(slug, 'NOT FOUND')
      continue
    }
    const series = a.series
    const seriesSlug = typeof series === 'object' ? series?.slug : null
    const seriesTiers = typeof series === 'object' ? series?.editionTiers?.length : null
    console.log('---', slug, '---')
    console.log('hasEditions:', a.hasEditions)
    console.log('series:', seriesSlug, 'series.editionTiers:', seriesTiers)
    console.log('dcs.editionTiers:', a.dcs?.editionTiers?.length ?? 0)
    if (a.dcs?.editionTiers?.length) {
      console.log(
        '  keys:',
        a.dcs.editionTiers.map((t) => t.seriesTierKey || t.tierName),
      )
    }
    console.log('ownershipRegistry:', a.ownershipRegistry?.length ?? 0)
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

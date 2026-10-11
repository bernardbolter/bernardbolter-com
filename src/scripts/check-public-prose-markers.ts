/**
 * Flag editorial staging markers in public artwork prose fields.
 * Does not rewrite records — exits non-zero when any hit is found (CI-friendly).
 *
 * Usage:
 *   npx tsx src/scripts/check-public-prose-markers.ts
 *   npm run check:public-prose
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import {
  findPublicProseMarkers,
  PUBLIC_PROSE_FIELD_MAP,
} from '@/lib/artwork/publicProseMarkers'

function asText(value: unknown, richText?: boolean): string | null {
  if (typeof value === 'string') {
    const t = value.trim()
    return t || null
  }
  if (richText && value && typeof value === 'object') {
    const t = lexicalToPlain(value).replace(/\s+/g, ' ').trim()
    return t || null
  }
  return null
}

async function main() {
  const payload = await getPayload({ config })
  const hits: Array<{
    slug: string
    field: string
    payloadField: string
    markers: string[]
    text: string
  }> = []

  let page = 1
  while (true) {
    const result = await payload.find({
      collection: 'artworks',
      limit: 50,
      page,
      depth: 0,
      overrideAccess: true,
    })
    for (const doc of result.docs) {
      const slug = typeof doc.slug === 'string' ? doc.slug : String(doc.id)
      for (const field of PUBLIC_PROSE_FIELD_MAP) {
        const text = asText(
          (doc as Record<string, unknown>)[field.key],
          'richText' in field ? Boolean(field.richText) : false,
        )
        if (!text) continue
        const markers = findPublicProseMarkers(text)
        if (markers.length === 0) continue
        hits.push({
          slug,
          field: field.reportAs,
          payloadField: field.key,
          markers,
          text,
        })
      }
    }
    if (!result.hasNextPage) break
    page += 1
  }

  console.log(JSON.stringify({ count: hits.length, hits }, null, 2))
  if (hits.length > 0) {
    console.error(
      `FAIL: ${hits.length} public prose field(s) contain editorial markers (NOTE:/TODO/…).`,
    )
    process.exit(1)
  }
  console.log('OK: no editorial markers in public artwork prose fields')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

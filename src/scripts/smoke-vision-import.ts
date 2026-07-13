/**
 * Smoke-test vision import + JSON-LD against the configured DATABASE_URL.
 *
 * Usage:
 *   npx tsx src/scripts/smoke-vision-import.ts --slug gates-iii
 *   npx tsx src/scripts/smoke-vision-import.ts --slug gates-iii --apply
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

import { applyVisionAnalysisImport } from '@/lib/studio/applyVisionAnalysisImport'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'
import { getSiteBaseUrl } from '@/lib/jsonld/site'

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

async function main() {
  const slug = readArg('--slug')?.trim()
  const apply = process.argv.includes('--apply')

  if (!slug) {
    console.error('Usage: npx tsx src/scripts/smoke-vision-import.ts --slug <slug> [--apply]')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  const admin = await payload.find({
    collection: 'users',
    where: { roles: { contains: 'admin' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const user = admin.docs[0]
  if (!user) {
    throw new Error('No admin user found for smoke test')
  }

  const before = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const artwork = before.docs[0]
  if (!artwork) {
    throw new Error(`Artwork not found: ${slug}`)
  }

  const existingCount = Array.isArray(artwork.visionAnalyses) ? artwork.visionAnalyses.length : 0
  console.log(`Artwork: ${slug} (id ${artwork.id})`)
  console.log(`visionAnalyses before: ${existingCount}`)
  console.log(`embeddings before: ${Array.isArray(artwork.embeddings) ? artwork.embeddings.length : 0}`)

  if (apply) {
    const stamp = new Date().toISOString().slice(0, 10)
    const results = await applyVisionAnalysisImport(payload, user, {
      slug,
      analyses: [
        {
          text: `Smoke-test vision analysis (${stamp}).`,
          model: 'claude-sonnet-4-6',
          date: stamp,
        },
      ],
    })
    console.log('import:', results[0])
  } else {
    console.log('Dry run only — pass --apply to append a smoke-test analysis row.')
  }

  const after = await payload.findByID({
    collection: 'artworks',
    id: artwork.id,
    depth: 0,
    overrideAccess: true,
  })

  const jsonLd = buildArtworkJsonLd(after, null, { baseUrl: getSiteBaseUrl() })
  const analyses = jsonLd['artism:visionAnalyses'] as Array<Record<string, unknown>> | undefined
  console.log(`visionAnalyses after: ${Array.isArray(after.visionAnalyses) ? after.visionAnalyses.length : 0}`)
  console.log(`JSON-LD artism:visionAnalyses entries: ${analyses?.length ?? 0}`)
  if (analyses?.length) {
    const last = analyses[analyses.length - 1]
    console.log(`JSON-LD latest text preview: ${String(last?.text ?? '').slice(0, 80)}…`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

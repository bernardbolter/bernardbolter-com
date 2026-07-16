/**
 * Gap-fill artwork visionAnalyses via Moondream Station.
 *
 * NEVER appends when a higher-tier (Claude etc.) analysis already exists.
 * NEVER appends a second Moondream row. Safe to re-run.
 *
 * Usage:
 *   npx tsx src/scripts/backfillArtworkVisionMoondream.ts --dry-run
 *   npx tsx src/scripts/backfillArtworkVisionMoondream.ts --limit 3
 *   npx tsx src/scripts/backfillArtworkVisionMoondream.ts --slug venice-in-the-middle
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

import { ARTWORK_MOONDREAM_VISION_PROMPT } from '@/lib/artwork/moondreamArtworkVisionPrompt'
import {
  decideMoondreamVisionAppend,
  MOONDREAM_VISION_MODEL,
} from '@/lib/artwork/visionAnalysisGuard'
import { getArtworkOriginalImageUrl } from '@/lib/media/artworkR2Images'
import { queryMoondreamImageUrl } from '@/lib/workers/moondream'
import type { Artwork } from '@/payload-types'

function parseArgs() {
  const limitIdx = process.argv.indexOf('--limit')
  const limit = limitIdx >= 0 ? Number.parseInt(process.argv[limitIdx + 1] ?? '', 10) : undefined
  const slugIdx = process.argv.indexOf('--slug')
  const slug = slugIdx >= 0 ? process.argv[slugIdx + 1] : undefined
  const dryRun = process.argv.includes('--dry-run')
  return {
    limit: Number.isFinite(limit) && (limit as number) > 0 ? limit : undefined,
    slug: slug?.trim() || undefined,
    dryRun,
  }
}

async function main() {
  const { limit, slug, dryRun } = parseArgs()
  const payload = await getPayload({ config })

  const where = slug
    ? { slug: { equals: slug } }
    : { status: { equals: 'published' as const } }

  const { docs } = await payload.find({
    collection: 'artworks',
    where,
    limit: limit ?? 500,
    depth: 1,
    overrideAccess: true,
    select: {
      title: true,
      slug: true,
      visionAnalyses: true,
      primaryImage: true,
      posterImage: true,
    },
  })

  let wouldAppend = 0
  let skippedHigher = 0
  let skippedMoondream = 0
  let skippedNoImage = 0
  let written = 0
  let failed = 0

  for (const artwork of docs as Artwork[]) {
    const decision = decideMoondreamVisionAppend(artwork.visionAnalyses)
    if (decision.action === 'skip') {
      if (decision.reason.includes('higher-tier')) skippedHigher += 1
      else skippedMoondream += 1
      console.log(`skip  ${artwork.slug}: ${decision.reason}`)
      continue
    }

    const imageUrl = getArtworkOriginalImageUrl(artwork)
    if (!imageUrl) {
      skippedNoImage += 1
      console.log(`skip  ${artwork.slug}: no image url`)
      continue
    }

    wouldAppend += 1
    if (dryRun) {
      console.log(`dry   ${artwork.slug}: would append moondream`)
      continue
    }

    try {
      const result = await queryMoondreamImageUrl(imageUrl, ARTWORK_MOONDREAM_VISION_PROMPT)
      const text = result.raw.trim()
      if (!text) throw new Error('Empty Moondream response')

      const existing = Array.isArray(artwork.visionAnalyses) ? artwork.visionAnalyses : []
      // Re-check after async work — fail closed.
      const recheck = decideMoondreamVisionAppend(existing)
      if (recheck.action === 'skip') {
        console.log(`skip  ${artwork.slug}: ${recheck.reason} (recheck)`)
        continue
      }

      await payload.update({
        collection: 'artworks',
        id: artwork.id,
        data: {
          visionAnalyses: [
            ...existing,
            {
              text,
              model: MOONDREAM_VISION_MODEL,
              date: new Date().toISOString(),
            },
          ],
        },
        overrideAccess: true,
        context: { skipAgent: true },
      })
      written += 1
      console.log(`ok    ${artwork.slug}`)
    } catch (error) {
      failed += 1
      console.error(
        `fail  ${artwork.slug}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  console.log('\nSummary')
  console.log({
    scanned: docs.length,
    wouldAppend,
    written,
    skippedHigher,
    skippedMoondream,
    skippedNoImage,
    failed,
    dryRun,
  })

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

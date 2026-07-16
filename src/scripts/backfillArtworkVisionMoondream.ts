/**
 * Gap-fill artwork catalogue fields via Moondream Station.
 *
 * Always appends a Moondream visionAnalyses row when missing (even if Claude
 * already exists — artwork page prefers Claude via preferredVisionAnalysis).
 * Also fills empty-only metadata: dominantColors, compositionalNotes,
 * conceptualKeywords, descriptionShort.
 *
 * Safe to re-run: never second Moondream row; never overwrites non-empty fields.
 *
 * Usage:
 *   npm run backfill:vision -- --dry-run
 *   npm run backfill:vision -- --limit 3
 *   npm run backfill:vision -- --slug venice-in-the-middle
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

import {
  ARTWORK_MOONDREAM_COLORS_PROMPT,
  ARTWORK_MOONDREAM_COMPOSITION_PROMPT,
  ARTWORK_MOONDREAM_TAGS_PROMPT,
  ARTWORK_MOONDREAM_VISION_PROMPT,
  descriptionShortFromProse,
  parseMoondreamHexColors,
  parseMoondreamKeywordList,
} from '@/lib/artwork/moondreamArtworkVisionPrompt'
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
  const proseOnly = process.argv.includes('--prose-only')
  return {
    limit: Number.isFinite(limit) && (limit as number) > 0 ? limit : undefined,
    slug: slug?.trim() || undefined,
    dryRun,
    proseOnly,
  }
}

function needsColors(artwork: Artwork): boolean {
  return !artwork.dominantColors?.some((row) => row?.hex?.trim())
}

function needsComposition(artwork: Artwork): boolean {
  return !artwork.compositionalNotes?.trim()
}

function needsKeywords(artwork: Artwork): boolean {
  return !artwork.conceptualKeywords?.some((row) => row?.keyword?.trim())
}

function needsDescriptionShort(artwork: Artwork): boolean {
  return !artwork.descriptionShort?.trim()
}

function needsAnyEnrichment(artwork: Artwork, proseOnly: boolean): boolean {
  const needsProse = decideMoondreamVisionAppend(artwork.visionAnalyses).action === 'append'
  if (proseOnly) return needsProse
  return (
    needsProse ||
    needsColors(artwork) ||
    needsComposition(artwork) ||
    needsKeywords(artwork) ||
    needsDescriptionShort(artwork)
  )
}

async function main() {
  const { limit, slug, dryRun, proseOnly } = parseArgs()
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
      dominantColors: true,
      compositionalNotes: true,
      conceptualKeywords: true,
      descriptionShort: true,
    },
  })

  let wouldProcess = 0
  let skippedNothing = 0
  let skippedNoImage = 0
  let written = 0
  let failed = 0
  const fieldCounts = {
    visionAnalyses: 0,
    dominantColors: 0,
    compositionalNotes: 0,
    conceptualKeywords: 0,
    descriptionShort: 0,
  }

  for (const artwork of docs as Artwork[]) {
    if (!needsAnyEnrichment(artwork, proseOnly)) {
      skippedNothing += 1
      console.log(`skip  ${artwork.slug}: nothing empty for Moondream`)
      continue
    }

    const imageUrl = getArtworkOriginalImageUrl(artwork)
    if (!imageUrl) {
      skippedNoImage += 1
      console.log(`skip  ${artwork.slug}: no image url`)
      continue
    }

    wouldProcess += 1
    const plan = {
      prose: decideMoondreamVisionAppend(artwork.visionAnalyses).action === 'append',
      colors: !proseOnly && needsColors(artwork),
      composition: !proseOnly && needsComposition(artwork),
      keywords: !proseOnly && needsKeywords(artwork),
      descriptionShort: !proseOnly && needsDescriptionShort(artwork),
    }

    if (dryRun) {
      console.log(`dry   ${artwork.slug}:`, plan)
      continue
    }

    try {
      const data: Record<string, unknown> = {}
      let proseText = ''

      if (plan.prose) {
        const result = await queryMoondreamImageUrl(imageUrl, ARTWORK_MOONDREAM_VISION_PROMPT)
        proseText = result.raw.trim()
        if (!proseText) throw new Error('Empty Moondream prose response')

        const existing = Array.isArray(artwork.visionAnalyses) ? artwork.visionAnalyses : []
        const recheck = decideMoondreamVisionAppend(existing)
        if (recheck.action === 'skip') {
          console.log(`skip  ${artwork.slug}: ${recheck.reason} (recheck)`)
        } else {
          data.visionAnalyses = [
            ...existing,
            {
              text: proseText,
              model: MOONDREAM_VISION_MODEL,
              date: new Date().toISOString(),
            },
          ]
          fieldCounts.visionAnalyses += 1
        }
      }

      if (plan.colors) {
        const result = await queryMoondreamImageUrl(imageUrl, ARTWORK_MOONDREAM_COLORS_PROMPT)
        const hexes = parseMoondreamHexColors(result.raw)
        if (hexes.length > 0) {
          data.dominantColors = hexes.map((hex) => ({ hex }))
          fieldCounts.dominantColors += 1
        }
      }

      if (plan.composition) {
        const result = await queryMoondreamImageUrl(
          imageUrl,
          ARTWORK_MOONDREAM_COMPOSITION_PROMPT,
        )
        const notes = result.raw.trim()
        if (notes) {
          data.compositionalNotes = notes
          fieldCounts.compositionalNotes += 1
        }
      }

      if (plan.keywords) {
        const result = await queryMoondreamImageUrl(imageUrl, ARTWORK_MOONDREAM_TAGS_PROMPT)
        const keywords = parseMoondreamKeywordList(result.raw)
        if (keywords.length > 0) {
          data.conceptualKeywords = keywords.map((keyword) => ({ keyword }))
          fieldCounts.conceptualKeywords += 1
        }
      }

      if (plan.descriptionShort) {
        if (!proseText && plan.prose === false) {
          // Need prose to derive short description — fetch once if not already.
          const result = await queryMoondreamImageUrl(imageUrl, ARTWORK_MOONDREAM_VISION_PROMPT)
          proseText = result.raw.trim()
        }
        const short = descriptionShortFromProse(proseText)
        if (short) {
          data.descriptionShort = short
          fieldCounts.descriptionShort += 1
        }
      }

      if (Object.keys(data).length === 0) {
        console.log(`skip  ${artwork.slug}: Moondream returned nothing usable`)
        continue
      }

      await payload.update({
        collection: 'artworks',
        id: artwork.id,
        data,
        overrideAccess: true,
        context: { skipAgent: true },
      })
      written += 1
      console.log(`ok    ${artwork.slug}:`, Object.keys(data).join(', '))
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
    wouldProcess,
    written,
    skippedNothing,
    skippedNoImage,
    failed,
    fieldCounts,
    dryRun,
    proseOnly,
  })

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

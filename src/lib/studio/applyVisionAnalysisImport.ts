import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import {
  normalizeVisionImportItems,
  type VisionAnalysisImportInput,
} from './archiveImportSchemas'
import { revalidateArtworkPaths } from './revalidateArtworkPaths'
import {
  decideMoondreamVisionAppend,
  isMoondreamVisionModel,
} from '@/lib/artwork/visionAnalysisGuard'

export type VisionAnalysisImportResult = {
  slug: string
  artworkId: number
  appended: number
  total: number
}

export async function applyVisionAnalysisImport(
  payload: Payload,
  user: User,
  input: VisionAnalysisImportInput,
): Promise<VisionAnalysisImportResult[]> {
  const items = normalizeVisionImportItems(input)
  const results: VisionAnalysisImportResult[] = []

  for (const item of items) {
    const slug = item.slug.trim()
    const response = await payload.find({
      collection: 'artworks',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    })

    const artwork = response.docs[0]
    if (!artwork) {
      throw new Error(`Artwork not found for slug "${slug}"`)
    }

    const existing = Array.isArray(artwork.visionAnalyses) ? artwork.visionAnalyses : []
    const appendedRows = item.analyses
      .map((row) => ({
        text: row.text.trim(),
        model: row.model.trim(),
        date: row.date.trim(),
      }))
      .filter((row) => {
        if (!isMoondreamVisionModel(row.model)) return true
        const decision = decideMoondreamVisionAppend(existing)
        if (decision.action === 'skip') {
          console.warn(
            `[vision-import] skip moondream for ${slug}: ${decision.reason}`,
          )
          return false
        }
        return true
      })

    if (appendedRows.length === 0) {
      results.push({
        slug,
        artworkId: artwork.id,
        appended: 0,
        total: existing.length,
      })
      continue
    }

    const next = [...existing, ...appendedRows]

    await payload.update({
      collection: 'artworks',
      id: artwork.id,
      data: { visionAnalyses: next },
      overrideAccess: false,
      user,
    })

    revalidateArtworkPaths(slug)

    results.push({
      slug,
      artworkId: artwork.id,
      appended: appendedRows.length,
      total: next.length,
    })
  }

  return results
}

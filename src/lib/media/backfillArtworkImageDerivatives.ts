import { getPayload } from 'payload'

import config from '@payload-config'
import { getArtworkOriginalImageUrl } from '@/lib/media/artworkR2Images'
import {
  resizeArtworkDerivatives,
  type ResizeArtworkDerivativesResult,
} from '@/lib/media/resizeArtworkDerivatives'

export type BackfillArtworkImageDerivativesOptions = {
  /** Process only this slug (must be published with a primary image). */
  slug?: string
  /** Stop after N artworks (after filters). */
  limit?: number
  /** List targets only — no fetch/resize/upload. */
  dryRun?: boolean
  onArtworkResult?: (info: {
    slug: string
    imageUrl: string
    result?: ResizeArtworkDerivativesResult
    error?: string
  }) => void
}

export type BackfillArtworkImageDerivativesSummary = {
  processed: number
  skipped: number
  errored: number
  listed: number
}

export async function backfillArtworkImageDerivatives(
  options: BackfillArtworkImageDerivativesOptions = {},
): Promise<BackfillArtworkImageDerivativesSummary> {
  const payload = await getPayload({ config })
  const slugFilter = options.slug?.trim()
  const limit = options.limit && options.limit > 0 ? options.limit : undefined
  const dryRun = options.dryRun === true

  const summary: BackfillArtworkImageDerivativesSummary = {
    processed: 0,
    skipped: 0,
    errored: 0,
    listed: 0,
  }

  let page = 1
  let seen = 0

  while (true) {
    const where = slugFilter
      ? {
          and: [
            { status: { equals: 'published' as const } },
            { primaryImage: { exists: true } },
            { slug: { equals: slugFilter } },
          ],
        }
      : {
          and: [
            { status: { equals: 'published' as const } },
            { primaryImage: { exists: true } },
          ],
        }

    const response = await payload.find({
      collection: 'artworks',
      where,
      depth: 1,
      limit: 50,
      page,
      pagination: true,
      overrideAccess: true,
    })

    if (response.docs.length === 0) break

    for (const artwork of response.docs) {
      if (limit != null && seen >= limit) {
        return summary
      }
      seen += 1

      const slug = artwork.slug?.trim()
      const imageUrl = getArtworkOriginalImageUrl(artwork)
      if (!slug || !imageUrl) {
        summary.skipped += 1
        options.onArtworkResult?.({
          slug: slug ?? '(missing slug)',
          imageUrl: imageUrl ?? '',
          error: 'missing slug or primary image URL',
        })
        continue
      }

      if (dryRun) {
        summary.listed += 1
        options.onArtworkResult?.({ slug, imageUrl })
        continue
      }

      try {
        const result = await resizeArtworkDerivatives(slug, imageUrl)
        options.onArtworkResult?.({ slug, imageUrl, result })
        if (result.errors.length > 0) {
          summary.errored += 1
        } else {
          summary.processed += 1
        }
      } catch (error) {
        summary.errored += 1
        const message = error instanceof Error ? error.message : String(error)
        options.onArtworkResult?.({ slug, imageUrl, error: message })
      }
    }

    if (slugFilter) break
    if (!response.hasNextPage) break
    if (limit != null && seen >= limit) break
    page += 1
  }

  return summary
}

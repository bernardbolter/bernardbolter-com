import type { CollectionBeforeChangeHook } from 'payload'

import {
  buildAutopopulatedSeriesEditionTiers,
  fetchSeriesEditionTierKeysForSlug,
  getSeriesEditionTierAutopopulateTarget,
  resolveArtworkSeriesSlugForAutopopulate,
  shouldAutopopulateSeriesEditionTiers,
} from '@/lib/artwork/seriesEditionTierAutopopulate'

function shouldSkipAutopopulate(context: Record<string, unknown> | undefined): boolean {
  return Boolean(context?.skipSeriesEditionTierAutopopulate || context?.skipDcsEditionTierAutopopulate)
}

export const artworkSeriesEditionTiersBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  context,
  req,
}) => {
  if (shouldSkipAutopopulate(context as Record<string, unknown> | undefined)) return data

  const d = data as Record<string, unknown>
  const prev = (originalDoc ?? {}) as Record<string, unknown>

  const seriesSlug = await resolveArtworkSeriesSlugForAutopopulate(d, prev, req)
  const target = getSeriesEditionTierAutopopulateTarget(seriesSlug)
  if (!target) return data

  const effectiveTiers = target.resolveEffectiveTiers(d, prev)

  if (
    !shouldAutopopulateSeriesEditionTiers({
      seriesSlug,
      editionTiers: effectiveTiers,
    })
  ) {
    return data
  }

  const tierIds = await fetchSeriesEditionTierKeysForSlug(req, target.seriesSlug)
  if (tierIds.length === 0) return data

  target.applyAutopopulatedTiers(d, buildAutopopulatedSeriesEditionTiers(tierIds))

  return data
}

/** @deprecated Use artworkSeriesEditionTiersBeforeChange */
export const artworkDcsEditionTiersBeforeChange = artworkSeriesEditionTiersBeforeChange

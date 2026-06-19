import type { CollectionBeforeChangeHook } from 'payload'

import {
  buildAutopopulatedDcsEditionTiers,
  fetchDcsSeriesEditionTierIds,
  resolveDcsSeriesSlug,
  resolveEffectiveEditionTiers,
  shouldAutopopulateDcsEditionTiers,
} from '@/lib/artwork/dcsEditionTierAutopopulate'

export const artworkDcsEditionTiersBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  context,
  req,
}) => {
  if (context?.skipDcsEditionTierAutopopulate) return data

  const d = data as Record<string, unknown>
  const prev = (originalDoc ?? {}) as Record<string, unknown>

  const seriesSlug = await resolveDcsSeriesSlug(d, prev, req)
  const effectiveTiers = resolveEffectiveEditionTiers(d, prev)

  if (
    !shouldAutopopulateDcsEditionTiers({
      seriesSlug,
      editionTiers: effectiveTiers,
    })
  ) {
    return data
  }

  const tierIds = await fetchDcsSeriesEditionTierIds(req)
  if (tierIds.length === 0) return data

  const prevDcs = (d.dcs as Record<string, unknown> | undefined) ?? {}
  d.dcs = {
    ...prevDcs,
    editionTiers: buildAutopopulatedDcsEditionTiers(tierIds),
  }

  return data
}

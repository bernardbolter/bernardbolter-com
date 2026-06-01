import {
  ACH_ROOT_SERIES_SLUG,
  DCS_ROOT_SERIES_SLUG,
  MEGACITIES_ROOT_SERIES_SLUG,
} from './catalogScope'
import type { TimelineEntry } from './sessionTimeline'

function readSeriesSlugFromTimeline(timeline: TimelineEntry[]): string | null {
  const slugEntry = [...timeline]
    .reverse()
    .find((e) => e.targetCollection === 'artworks' && e.field === 'seriesSlug')
  if (typeof slugEntry?.value === 'string' && slugEntry.value.trim()) {
    return slugEntry.value.trim()
  }

  const seriesEntry = [...timeline]
    .reverse()
    .find((e) => e.targetCollection === 'artworks' && e.field === 'series')
  const value = seriesEntry?.value
  if (typeof value === 'string' && value.trim() && !/^\d+$/.test(value.trim())) {
    return value.trim()
  }
  if (value && typeof value === 'object' && value !== null && 'slug' in value) {
    const slug = (value as { slug?: unknown }).slug
    if (typeof slug === 'string' && slug.trim()) return slug.trim()
  }
  return null
}

export function seriesMediaFlagsFromTimeline(timeline: TimelineEntry[]): {
  seriesSlug: string | null
  isAchWork: boolean
  isDcsWork: boolean
  isMegacitiesWork: boolean
} {
  const seriesSlug = readSeriesSlugFromTimeline(timeline)
  const hasAchTimeline = timeline.some((e) => String(e.field ?? '').startsWith('ach.'))

  return {
    seriesSlug,
    isDcsWork: seriesSlug === DCS_ROOT_SERIES_SLUG,
    isMegacitiesWork: seriesSlug === MEGACITIES_ROOT_SERIES_SLUG,
    isAchWork:
      seriesSlug === ACH_ROOT_SERIES_SLUG ||
      (hasAchTimeline &&
        seriesSlug !== DCS_ROOT_SERIES_SLUG &&
        seriesSlug !== MEGACITIES_ROOT_SERIES_SLUG),
  }
}

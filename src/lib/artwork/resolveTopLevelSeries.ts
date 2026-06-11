import type { Series } from '@/payload-types'

/** Walk parentSeries until the top-level series is reached. */
export function resolveTopLevelSeries(series: Series): Series {
  let current: Series = series
  while (current.parentSeries && typeof current.parentSeries === 'object') {
    current = current.parentSeries as Series
  }
  return current
}

export function resolveArtworkTopLevelSeries(
  series: number | Series | null | undefined,
): Series | null {
  if (!series || typeof series !== 'object') return null
  return resolveTopLevelSeries(series)
}

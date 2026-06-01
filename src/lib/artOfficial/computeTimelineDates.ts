import type { DatedWork } from './sequencing/types'
import { isAnchorWork, parseIsoDate } from './sequencing/types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function clampDate(date: Date, work: DatedWork, now = new Date()): Date {
  const minYear = work.seriesYearStart ?? work.yearCreated - 5
  const maxYear = work.seriesYearEnd ?? now.getUTCFullYear() + 1
  const min = Date.UTC(minYear, 0, 1)
  const max = Date.UTC(maxYear, 11, 31)
  const t = date.getTime()
  if (t < min) return new Date(min)
  if (t > max) return new Date(max)
  return date
}

function midYearDate(year: number): Date {
  return new Date(Date.UTC(year, 6, 1))
}

function computeNoAnchorFallback(sorted: DatedWork[]): Map<string, Date> {
  const result = new Map<string, Date>()
  const byYear = new Map<number, DatedWork[]>()

  for (const work of sorted) {
    const bucket = byYear.get(work.yearCreated) ?? []
    bucket.push(work)
    byYear.set(work.yearCreated, bucket)
  }

  for (const work of sorted) {
    const peers = byYear.get(work.yearCreated) ?? [work]
    peers.sort((a, b) => a.sortIndex - b.sortIndex)
    const idx = peers.findIndex((p) => p.id === work.id)
    const spread = peers.length > 1 ? idx / (peers.length - 1) : 0.5
    const start = Date.UTC(work.yearCreated, 0, 1)
    const end = Date.UTC(work.yearCreated, 11, 31)
    const t = start + spread * (end - start)
    result.set(work.id, new Date(t))
  }

  return result
}

function extrapolateBefore(
  work: DatedWork,
  anchor: DatedWork,
  anchorDate: Date,
  cadenceMs: number,
): Date {
  const deltaIndex = anchor.sortIndex - work.sortIndex
  return clampDate(new Date(anchorDate.getTime() - deltaIndex * cadenceMs), work)
}

function extrapolateAfter(
  work: DatedWork,
  anchor: DatedWork,
  anchorDate: Date,
  cadenceMs: number,
): Date {
  const deltaIndex = work.sortIndex - anchor.sortIndex
  return clampDate(new Date(anchorDate.getTime() + deltaIndex * cadenceMs), work)
}

/** Deterministic timelineDate interpolation — layout only, never a public date claim. */
export function computeTimelineDates(works: DatedWork[]): Map<string, Date> {
  const sorted = [...works].sort((a, b) => a.sortIndex - b.sortIndex)
  const result = new Map<string, Date>()
  if (sorted.length === 0) return result

  const anchors = sorted.filter(isAnchorWork)
  if (anchors.length === 0) {
    return computeNoAnchorFallback(sorted)
  }

  for (const anchor of anchors) {
    const d = parseIsoDate(anchor.dateKnown)
    if (d) result.set(anchor.id, d)
  }

  const defaultCadence = MS_PER_DAY * 180

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i]
    const b = anchors[i + 1]
    const dA = result.get(a.id)!
    const dB = result.get(b.id)!
    const span = b.sortIndex - a.sortIndex
    const cadence = span > 0 ? (dB.getTime() - dA.getTime()) / span : defaultCadence

    for (const work of sorted) {
      if (isAnchorWork(work)) continue
      if (work.sortIndex <= a.sortIndex || work.sortIndex >= b.sortIndex) continue
      const t = (work.sortIndex - a.sortIndex) / span
      result.set(work.id, new Date(dA.getTime() + t * (dB.getTime() - dA.getTime())))
    }

    if (i === 0) {
      for (const work of sorted) {
        if (isAnchorWork(work)) continue
        if (work.sortIndex >= a.sortIndex) continue
        result.set(work.id, extrapolateBefore(work, a, dA, cadence))
      }
    }

    if (i === anchors.length - 2) {
      for (const work of sorted) {
        if (isAnchorWork(work)) continue
        if (work.sortIndex <= b.sortIndex) continue
        result.set(work.id, extrapolateAfter(work, b, dB, cadence))
      }
    }
  }

  if (anchors.length === 1) {
    const anchor = anchors[0]
    const d = result.get(anchor.id)!
    for (const work of sorted) {
      if (isAnchorWork(work)) continue
      if (work.sortIndex < anchor.sortIndex) {
        result.set(work.id, extrapolateBefore(work, anchor, d, defaultCadence))
      } else if (work.sortIndex > anchor.sortIndex) {
        result.set(work.id, extrapolateAfter(work, anchor, d, defaultCadence))
      }
    }
  }

  for (const work of sorted) {
    if (!result.has(work.id)) {
      result.set(work.id, midYearDate(work.yearCreated))
    }
  }

  return result
}

/** Midpoint sortIndex between neighbours — float, no corpus renumbering. */
export function computeMidpointSortIndex(
  lower: number | null | undefined,
  upper: number | null | undefined,
): number {
  if (lower != null && upper != null) return (lower + upper) / 2
  if (lower != null) return lower + 0.5
  if (upper != null) return upper - 0.5
  return 0
}

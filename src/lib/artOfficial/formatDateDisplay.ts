import type { DatePrecision } from './sequencing/types'
import { parseIsoDate } from './sequencing/types'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function formatExactDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function formatMonthDate(d: Date): string {
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function formatYearRange(yearCreated: number, yearCompleted?: number | null): string {
  if (yearCompleted != null && yearCompleted !== yearCreated) {
    return `${yearCreated}–${yearCompleted}`
  }
  return String(yearCreated)
}

function formatBounds(
  earliest: Date | null,
  latest: Date | null,
): string | null {
  if (earliest && latest) {
    return `${earliest.getUTCFullYear()}–${latest.getUTCFullYear()}`
  }
  if (earliest) return `from ${earliest.getUTCFullYear()}`
  if (latest) return `until ${latest.getUTCFullYear()}`
  return null
}

export function formatDateDisplay(args: {
  datePrecision?: DatePrecision | null
  yearCreated: number
  yearCompleted?: number | null
  dateKnown?: string | Date | null
  dateEarliest?: string | Date | null
  dateLatest?: string | Date | null
  seriesYearStart?: number | null
  seriesYearEnd?: number | null
}): string {
  const precision = args.datePrecision ?? 'unknown'
  const known = parseIsoDate(args.dateKnown)
  const earliest = parseIsoDate(args.dateEarliest)
  const latest = parseIsoDate(args.dateLatest)

  if (precision === 'exact' && known) return formatExactDate(known)
  if (precision === 'month' && known) return formatMonthDate(known)
  if (precision === 'year') return formatYearRange(args.yearCreated, args.yearCompleted)
  if (precision === 'circa') return `c. ${args.yearCreated}`
  if (precision === 'decade') {
    const decade = Math.floor(args.yearCreated / 10) * 10
    return `${decade}s`
  }
  if (precision === 'unknown') {
    const bounds = formatBounds(earliest, latest)
    if (bounds) return bounds
    if (args.seriesYearStart != null && args.seriesYearEnd != null) {
      return `${args.seriesYearStart}–${args.seriesYearEnd}`
    }
    return 'date unknown'
  }

  const bounds = formatBounds(earliest, latest)
  return bounds ?? formatYearRange(args.yearCreated, args.yearCompleted)
}

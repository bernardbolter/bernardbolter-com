export type DatePrecision =
  | 'exact'
  | 'month'
  | 'year'
  | 'circa'
  | 'decade'
  | 'unknown'

export type DatedWork = {
  id: string
  sortIndex: number
  dateKnown: Date | null
  datePrecision: DatePrecision
  yearCreated: number
  seriesYearStart?: number | null
  seriesYearEnd?: number | null
}

export const ANCHOR_PRECISIONS: DatePrecision[] = ['exact', 'month', 'year']

export function isAnchorWork(work: DatedWork): boolean {
  return work.dateKnown != null && ANCHOR_PRECISIONS.includes(work.datePrecision)
}

export function parseIsoDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function defaultDatePrecision(
  value: string | null | undefined,
): DatePrecision {
  if (
    value === 'exact' ||
    value === 'month' ||
    value === 'year' ||
    value === 'circa' ||
    value === 'decade' ||
    value === 'unknown'
  ) {
    return value
  }
  return 'unknown'
}

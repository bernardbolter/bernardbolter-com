import { fractionToDecimal } from '@/utilities/fractionToDecimal'

/** Whole + optional fraction (e.g. 48 + 3/16) as a single quantity in cm or inches. */
export function resolvePhysicalDimension(
  whole: number | null | undefined,
  fraction?: string | null,
): number | null {
  const f = fraction?.trim() ?? ''
  const w = whole == null || Number.isNaN(Number(whole)) ? null : Number(whole)

  if (w == null && !f) return null
  if (!f) return w
  return (w ?? 0) + fractionToDecimal(f)
}

export function resolvePhysicalDimensionMm(
  whole: number | null | undefined,
  fraction: string | null | undefined,
  unit: 'cm' | 'in',
): number | null {
  const quantity = resolvePhysicalDimension(whole, fraction)
  if (quantity == null || quantity <= 0) return null
  return unit === 'in' ? quantity * 25.4 : quantity * 10
}

const FRACTION_PATTERN = /^\d+\s*\/\s*\d+$/

export function isValidDimensionFraction(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  return FRACTION_PATTERN.test(trimmed)
}

import { parseInputImperialToInches } from '@/helpers/convertUnits'
import { fractionToDecimal } from '@/utilities/fractionToDecimal'

/** Width/height in inches from whole + fraction fields (imperial). */
export function quantityInches(
  whole: number | null | undefined,
  fraction: string | null | undefined,
): number | null {
  const f = (fraction ?? '').trim()
  const w = whole == null || Number.isNaN(Number(whole)) ? null : Number(whole)

  if (!f && w == null) return null
  if (!f && w != null) return w

  const isMixed = /^\d+\s+\d+\/\d+$/.test(f)
  const isPlainFrac = /^\d+\/\d+$/.test(f)
  if (isMixed || (w == null && isPlainFrac)) {
    return parseInputImperialToInches(f)
  }

  const fracDec = fractionToDecimal(f)
  const base = w ?? 0
  return base + fracDec
}

/** Width/height in cm from whole + fraction fields (metric). */
export function quantityCm(
  whole: number | null | undefined,
  fraction: string | null | undefined,
): number | null {
  const f = (fraction ?? '').trim()
  const w = whole == null || Number.isNaN(Number(whole)) ? null : Number(whole)
  if (!f && w == null) return null
  if (!f && w != null) return w
  return (w ?? 0) + fractionToDecimal(f)
}

export function toMm(
  unit: string | null | undefined,
  whole: number | null | undefined,
  fraction: string | null | undefined,
): number | null {
  if (unit === 'in') {
    const inches = quantityInches(whole, fraction)
    if (inches == null) return null
    return Math.round(inches * 25.4 * 1000) / 1000
  }
  if (unit === 'cm') {
    const cm = quantityCm(whole, fraction)
    if (cm == null) return null
    return Math.round(cm * 10 * 1000) / 1000
  }
  return null
}

export function toCm(
  unit: string | null | undefined,
  whole: number | null | undefined,
  fraction: string | null | undefined,
): number | null {
  if (unit === 'in') {
    const inches = quantityInches(whole, fraction)
    if (inches == null) return null
    return Math.round(inches * 2.54 * 1000) / 1000
  }
  if (unit === 'cm') {
    return quantityCm(whole, fraction)
  }
  return null
}

export function formatDimLabel(
  whole: number | null | undefined,
  fraction: string | null | undefined,
): string | null {
  const f = (fraction ?? '').trim()
  if ((whole == null || Number.isNaN(Number(whole))) && !f) return null
  if ((whole == null || Number.isNaN(Number(whole))) && f) return f
  if (!f) return String(whole)
  return `${whole} ${f}`
}

export function buildDimensionsDisplay(
  data: Record<string, unknown>,
  unit: string | null | undefined,
): string | null {
  if (unit !== 'cm' && unit !== 'in') return null

  const wL = formatDimLabel(
    data.widthWhole as number | null | undefined,
    data.widthFraction as string | null | undefined,
  )
  const hL = formatDimLabel(
    data.heightWhole as number | null | undefined,
    data.heightFraction as string | null | undefined,
  )
  const dL = formatDimLabel(
    data.depthWhole as number | null | undefined,
    data.depthFraction as string | null | undefined,
  )

  const parts = [wL, hL, dL].filter(Boolean) as string[]
  if (parts.length === 0) return null

  const suffix = unit === 'in' ? 'in' : 'cm'
  return `${parts.join(' × ')} ${suffix}`
}

/** Width × height only — for flat prints without depth. */
export function buildWidthHeightDimensionsDisplay(
  data: Record<string, unknown>,
  unit: string | null | undefined,
): string | null {
  if (unit !== 'cm' && unit !== 'in') return null

  const wL = formatDimLabel(
    data.widthWhole as number | null | undefined,
    data.widthFraction as string | null | undefined,
  )
  const hL = formatDimLabel(
    data.heightWhole as number | null | undefined,
    data.heightFraction as string | null | undefined,
  )

  const parts = [wL, hL].filter(Boolean) as string[]
  if (parts.length === 0) return null

  const suffix = unit === 'in' ? 'in' : 'cm'
  return `${parts.join(' × ')} ${suffix}`
}

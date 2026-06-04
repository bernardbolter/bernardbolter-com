import { inferSizeTierFromDimensions, type SizeTier } from './inferSizeTier'

export type Orientation = 'landscape' | 'portrait' | 'square'

export function deriveOrientation(
  width: number,
  height: number,
): Orientation {
  if (width > height) return 'landscape'
  if (height > width) return 'portrait'
  return 'square'
}

export function deriveSizeTier(args: {
  widthWhole: number
  heightWhole: number
  depthWhole?: number | null
  dimensionUnit: 'cm' | 'in'
}): SizeTier | null {
  return inferSizeTierFromDimensions({
    widthWhole: args.widthWhole,
    heightWhole: args.heightWhole,
    depthWhole: args.depthWhole,
    dimensionUnit: args.dimensionUnit,
  })
}

export function deriveAspectRatio(
  width: number,
  height: number,
  dimensionUnit: 'cm' | 'in',
): number | null {
  if (!width || !height) return null
  const wMm = dimensionUnit === 'in' ? width * 25.4 : width * 10
  const hMm = dimensionUnit === 'in' ? height * 25.4 : height * 10
  if (!hMm) return null
  return Math.round((wMm / hMm) * 10_000) / 10_000
}

export function toCmWhole(value: number, unit: 'cm' | 'in'): number {
  if (unit === 'cm') return value
  return Math.round(value * 2.54 * 100) / 100
}

export function slugifyArtworkTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

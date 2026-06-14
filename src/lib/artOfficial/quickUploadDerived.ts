import {
  resolvePhysicalDimension,
  resolvePhysicalDimensionMm,
} from '@/lib/artOfficial/physicalDimensions'

import { inferSizeTierFromDimensions, type SizeTier } from './inferSizeTier'

export type Orientation = 'landscape' | 'portrait' | 'square'

export function deriveOrientation(args: {
  widthWhole: number
  heightWhole: number
  widthFraction?: string | null
  heightFraction?: string | null
}): Orientation {
  const width = resolvePhysicalDimension(args.widthWhole, args.widthFraction) ?? 0
  const height = resolvePhysicalDimension(args.heightWhole, args.heightFraction) ?? 0
  if (width > height) return 'landscape'
  if (height > width) return 'portrait'
  return 'square'
}

export function deriveSizeTier(args: {
  widthWhole: number
  heightWhole: number
  depthWhole?: number | null
  widthFraction?: string | null
  heightFraction?: string | null
  depthFraction?: string | null
  dimensionUnit: 'cm' | 'in'
}): SizeTier | null {
  return inferSizeTierFromDimensions(args)
}

export function deriveAspectRatio(args: {
  widthWhole: number
  heightWhole: number
  widthFraction?: string | null
  heightFraction?: string | null
  dimensionUnit: 'cm' | 'in'
}): number | null {
  const wMm = resolvePhysicalDimensionMm(args.widthWhole, args.widthFraction, args.dimensionUnit)
  const hMm = resolvePhysicalDimensionMm(args.heightWhole, args.heightFraction, args.dimensionUnit)
  if (!wMm || !hMm) return null
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

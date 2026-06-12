export const SIZE_TIER_VALUES = ['xs', 'sm', 'md', 'lg', 'xl'] as const
export type SizeTier = (typeof SIZE_TIER_VALUES)[number]

/**
 * Rule-of-thumb tier from longest dimension (schema admin copy on Artworks.sizeTier).
 * For agent dialogue suggestions only — Art/Official never writes this at commit;
 * the artist must confirm sizeTier in conversation first.
 * Thresholds in mm: <150 xs, 150–300 sm, 300–800 md, 800–2000 lg, >2000 xl.
 */
export function inferSizeTierFromDimensions(args: {
  widthWhole?: number | null
  heightWhole?: number | null
  depthWhole?: number | null
  dimensionUnit?: string | null
}): SizeTier | null {
  const unit = args.dimensionUnit === 'in' ? 'in' : 'cm'
  const values = [args.widthWhole, args.heightWhole, args.depthWhole].filter(
    (n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0,
  )
  if (values.length === 0) return null

  const longest = Math.max(...values)
  const longestMm = unit === 'in' ? longest * 25.4 : longest * 10

  if (longestMm < 150) return 'xs'
  if (longestMm < 300) return 'sm'
  if (longestMm < 800) return 'md'
  if (longestMm < 2000) return 'lg'
  return 'xl'
}

export function normalizeSizeTier(value: unknown): SizeTier | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().toLowerCase()
  return (SIZE_TIER_VALUES as readonly string[]).includes(v) ? (v as SizeTier) : undefined
}

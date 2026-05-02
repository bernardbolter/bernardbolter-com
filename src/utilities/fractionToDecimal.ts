/**
 * Parses a single fractional or decimal fragment, e.g. `'3/16'` → `0.1875`.
 * Empty / whitespace → `0`. Invalid denominator → `0`.
 */
export function fractionToDecimal(input: string | null | undefined): number {
  if (input == null) return 0
  const s = String(input).trim()
  if (s === '') return 0

  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) {
    const num = parseInt(frac[1], 10)
    const den = parseInt(frac[2], 10)
    if (den === 0 || Number.isNaN(num)) return 0
    return num / den
  }

  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

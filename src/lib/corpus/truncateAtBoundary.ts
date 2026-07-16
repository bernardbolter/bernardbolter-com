/**
 * Boundary-aware text truncation for Tier-1 corpus index fields.
 * Prefer a complete sentence; otherwise fall back to a complete word + ellipsis.
 */
export function truncateAtBoundary(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxChars) return normalized

  const slice = normalized.slice(0, maxChars)
  const lastSentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('.\n'))
  if (lastSentenceEnd > maxChars * 0.5) {
    return slice.slice(0, lastSentenceEnd + 1).trimEnd()
  }

  const lastSpace = slice.lastIndexOf(' ')
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : maxChars).trimEnd()}…`
}

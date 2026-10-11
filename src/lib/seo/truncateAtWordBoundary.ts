/** Cap prose for meta descriptions — never mid-word. */
export function truncateAtWordBoundary(text: string, maxLength = 155): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized

  const slice = normalized.slice(0, maxLength)
  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace <= 0) {
    // Single overlong token — hard cut is last resort.
    return slice.replace(/[.,;:!?]+$/g, '')
  }
  return slice.slice(0, lastSpace).replace(/[.,;:!?]+$/g, '')
}

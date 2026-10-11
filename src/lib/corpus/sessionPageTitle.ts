/**
 * Public session page / link title.
 * Example: "The Thinker — Art/Official session, July 28, 2026"
 */
export function formatSessionCompletedLabel(isoDate: string | null | undefined): string | null {
  if (!isoDate?.trim()) return null
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatSessionPageTitle(options: {
  artworkTitle?: string | null
  completedAt?: string | null
}): string {
  const work = options.artworkTitle?.trim() || 'Artwork'
  const when = formatSessionCompletedLabel(options.completedAt)
  if (when) return `${work} — Art/Official session, ${when}`
  return `${work} — Art/Official session`
}

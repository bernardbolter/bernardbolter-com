/** Human-readable date/time for CLIP embedding metadata on the public embedding page. */
export function formatClipEmbeddingGeneratedAt(value?: string | null): string {
  if (!value?.trim()) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.trim()
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

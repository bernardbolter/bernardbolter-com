/** Client-safe types and helpers for legacy WordPress quick-upload prefill. */

export type WordpressImportEntry = {
  id: number
  title: string
  wpSlug: string | null
  year: number | null
  medium: string | null
  widthCm: number | null
  heightCm: number | null
  seriesName: string | null
  seriesSlug: string | null
  orientation: 'landscape' | 'portrait' | 'square' | null
  sizeTier: 'sm' | 'md' | 'lg' | 'xl' | null
  availabilityStatus: 'not-for-sale' | 'available' | 'sold' | 'on-loan' | null
}

export function formatWpImportLabel(entry: WordpressImportEntry): string {
  const year = entry.year ? ` — ${entry.year}` : ''
  const series = entry.seriesName ? ` · ${entry.seriesName}` : ''
  return `${entry.title}${year}${series}`
}

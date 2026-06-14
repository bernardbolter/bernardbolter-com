/** Client-safe types and helpers for legacy WordPress quick-upload prefill. */

export type WordpressImportEntry = {
  id: number
  title: string
  wpSlug: string | null
  year: number | null
  medium: string | null
  widthWhole: number | null
  widthFraction: string | null
  heightWhole: number | null
  heightFraction: string | null
  dimensionUnit: 'cm' | 'in' | null
  seriesName: string | null
  seriesSlug: string | null
  orientation: 'landscape' | 'portrait' | 'square' | null
  sizeTier: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | null
  availabilityStatus: 'not-for-sale' | 'available' | 'sold' | 'on-loan' | null
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
  artworkImageUrl: string | null
  streetPhotoCaption: string | null
  cityPopulation: number | null
  cityAreaKm2: number | null
  cityPopulationDensity: number | null
  cityElevationM: number | null
  coordinatesText: string | null
}

export function formatWpImportLabel(entry: WordpressImportEntry): string {
  const year = entry.year ? ` — ${entry.year}` : ''
  const place =
    entry.city && entry.country ? ` · ${entry.city}, ${entry.country}`
    : entry.city ? ` · ${entry.city}`
    : entry.seriesName ? ` · ${entry.seriesName}`
    : ''
  return `${entry.title}${year}${place}`
}

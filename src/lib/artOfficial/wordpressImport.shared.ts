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
  /** ACH — studio / making location (WP `location`). */
  locationCreatedLabel: string | null
  /** ACH map & tour — from WP lat/lng when present. */
  achMapLat: number | null
  achMapLng: number | null
  achMapPresence: boolean
  /** Plain-text provenance bundle (WP provenance + exhibition + print editions). */
  provenanceNotes: string | null
  /** Legacy source photograph URLs for reference (not imported as media). */
  sourceImageUrls: string[]
  /** ACH story copy from WP colorfulFields.storyEn when export includes it. */
  storyEn: string | null
  /** True when slug/title indicates the Gates of Perception sub-series. */
  gatesOfPerception: boolean
  /** Megacities — mapped from WP `style` / medium / country hints. */
  megacitiesSeriesType:
    | 'composite_country'
    | 'skate_city'
    | 'cultural_composite'
    | 'exhibition_origin'
    | null
  /** Raw WP `style` string for display / classification notes. */
  megacitiesStyleLabel: string | null
  /** Megacities geographic scope — usually WP `country` on country composites. */
  megacitiesCoverageArea: string | null
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

/** Raw WordPress GraphQL node shape (stored verbatim in data/legacy/wp-artworks.json). */
export type WpArtworkFields = {
  year?: string | null
  city?: string | null
  country?: string | null
  lat?: string | null
  lng?: string | null
  location?: string | null
  medium?: string | null
  units?: string | string[] | null
  width?: string | null
  height?: string | null
  size?: string | string[] | null
  orientation?: string | string[] | null
  series?: string[] | null
  style?: string | null
  exhibitionHistory?: string | null
  provenance?: string | null
  printEditions?: string | null
  forsale?: boolean | null
  price?: string | null
  proportion?: string | number | null
  area?: string | null
  coordinates?: string | null
  density?: string | null
  elevation?: string | null
  population?: string | null
  dcsPhotoTitle?: string | null
  artworkImage?: { node?: { sourceUrl?: string | null } | null } | null
}

export type WpLegacyArtworkNode = {
  databaseId?: number | null
  slug?: string | null
  title?: string | null
  date?: string | null
  uri?: string | null
  featuredImage?: { node?: { sourceUrl?: string | null } | null } | null
  categories?: { nodes?: Array<{ name?: string | null; slug?: string | null }> } | null
  artworkFields?: WpArtworkFields | null
}

export type LegacyConflictType =
  | 'missing-title'
  | 'date-mismatch'
  | 'medium-unmatched'
  | 'dormant-field-present'

export interface LegacyConflict {
  type: LegacyConflictType
  detail: string
}

export interface LegacyRecord {
  legacyRecordId: number
  legacySlug: string
  titleCandidate: string | null
  slugDerivedTitle: string

  yearCandidate: number | null
  postDate: string | null
  dateNotes: string[]

  series: string | null
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
  mediumRaw: string | null
  dimensionUnit: 'cm' | 'in' | null
  width: number | null
  height: number | null
  sizeTier: string | null
  orientation: string | null
  imageUrl: string | null

  exhibitionHistoryText: string | null
  provenanceText: string | null
  printEditionsText: string | null
  locationText: string | null
  forSale: boolean | null
  priceRaw: string | null

  conflicts: LegacyConflict[]
}

export type LegacyRecordSummary = {
  legacyRecordId: number
  legacySlug: string
  titleCandidate: string | null
  yearCandidate: number | null
}

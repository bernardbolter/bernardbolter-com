/**
 * WP → Payload field disposition reference (art-official-legacy-lookup-spec.md Part 2).
 * Normalisation applies these rules at lookup time — the export stores raw WP nodes only.
 */
export type FieldDisposition =
  | 'map'
  | 'confirm'
  | 'transform'
  | 'surface'
  | 'skip'
  | 'ignore'
  | 'infer-confirm'
  | 'series-specific'

export const LEGACY_FIELD_MAPPING: Array<{
  wpField: string
  payloadField: string | null
  disposition: FieldDisposition
  note?: string
}> = [
  { wpField: 'databaseId', payloadField: 'legacyRecordId', disposition: 'map' },
  { wpField: 'slug', payloadField: 'legacySlug', disposition: 'map' },
  {
    wpField: 'title',
    payloadField: 'title',
    disposition: 'confirm',
    note: 'Often null — derive slugDerivedTitle; never auto-accept.',
  },
  {
    wpField: 'year',
    payloadField: 'yearCreated',
    disposition: 'transform',
    note: 'datePrecision: year pending confirmation.',
  },
  {
    wpField: 'date',
    payloadField: 'timelineDate',
    disposition: 'surface',
    note: 'Timeline positioning seed only — not a public date claim.',
  },
  { wpField: 'categories / series', payloadField: 'series', disposition: 'transform' },
  { wpField: 'city', payloadField: 'city', disposition: 'map' },
  { wpField: 'country', payloadField: 'country', disposition: 'map' },
  { wpField: 'lat / lng', payloadField: null, disposition: 'surface' },
  {
    wpField: 'medium',
    payloadField: 'medium',
    disposition: 'confirm',
    note: 'Near-match select enum — confirm with artist.',
  },
  { wpField: 'units', payloadField: 'dimensionUnit', disposition: 'transform' },
  { wpField: 'width / height', payloadField: 'widthWhole / heightWhole', disposition: 'transform' },
  { wpField: 'proportion', payloadField: null, disposition: 'ignore' },
  { wpField: 'size', payloadField: 'sizeTier', disposition: 'map' },
  { wpField: 'orientation', payloadField: 'orientation', disposition: 'map' },
  { wpField: 'medium (support)', payloadField: 'support', disposition: 'infer-confirm' },
  { wpField: 'exhibitionHistory', payloadField: 'events', disposition: 'surface' },
  { wpField: 'forsale / price', payloadField: 'commerce', disposition: 'skip' },
  { wpField: 'provenance', payloadField: 'ownershipHistory', disposition: 'skip' },
  { wpField: 'printEditions', payloadField: null, disposition: 'surface' },
  { wpField: 'location', payloadField: null, disposition: 'surface' },
  {
    wpField: 'featuredImage',
    payloadField: null,
    disposition: 'surface',
    note: 'imageUrl reference.',
  },
  {
    wpField: 'area / coordinates / density / elevation / population / dcsPhotoTitle',
    payloadField: 'Megacities / DCS tabs',
    disposition: 'series-specific',
  },
]

/** Payload Artworks `medium` select values — used for medium-unmatched conflict detection. */
export const ARTWORK_MEDIUM_VALUES = [
  'acrylic-photo-transfer-on-canvas',
  'acrylic-on-canvas',
  'mixed-media-on-canvas',
  'photo-collage',
  'video',
  'digital',
  'other',
] as const

export type ArtworkMediumValue = (typeof ARTWORK_MEDIUM_VALUES)[number]

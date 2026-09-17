/** Shared city vocabulary for Neighborhood Commissions (Global, sources, ACH flags). */
export const NEIGHBORHOOD_COMMISSION_CITY_OPTIONS = [
  { label: 'San Francisco', value: 'san-francisco' },
] as const

export const NEIGHBORHOOD_COMMISSION_CITY_DEFAULT = 'san-francisco' as const

export const SOURCE_LICENSE_OPTIONS = [
  { label: 'CC0', value: 'cc0' },
  { label: 'CC BY', value: 'cc-by' },
  { label: 'CC BY-SA', value: 'cc-by-sa' },
  { label: 'Public domain', value: 'public-domain' },
  { label: 'Other', value: 'other' },
] as const

export const NEIGHBORHOOD_SOURCE_STATUS_OPTIONS = [
  { label: 'Available', value: 'available' },
  { label: 'Held', value: 'held' },
  { label: 'Commissioned', value: 'commissioned' },
  { label: 'Painted', value: 'painted' },
] as const

export const NEIGHBORHOOD_PROOF_ROLE_OPTIONS = [
  { label: 'Designer home commission', value: 'designer-home' },
  { label: 'ArtSpan juried selection', value: 'artspan-juried' },
  { label: 'Auction resale', value: 'auction-resale' },
  { label: 'Follow-on commission', value: 'follow-on-commission' },
] as const

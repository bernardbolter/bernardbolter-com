import { isFieldAllowedForAgent } from './fieldAllowlist'

/** Factual event fields Phase A may stage via propose/confirm (not Phase B prose). */
export const EVENT_PHASE_A_STAGING_FIELDS = [
  'venueAddress',
  'venueLatLng',
  'venueUrl',
  'venueCountry',
  'venueCity',
  'venueName',
  'venueTgnUri',
  'venueWikidataUri',
  'sameAs',
  'startDate',
  'endDate',
  'openingDate',
  'catalogueUrl',
  'pressUrl',
] as const

const FIELD_ALIASES: Record<string, string> = {
  venueWebsite: 'venueUrl',
  venuewebsite: 'venueUrl',
  exhibitionPage: 'sameAs',
  exhibitionUrl: 'sameAs',
}

export function normalizeEventPhaseAFieldName(fieldName: string): string {
  const trimmed = fieldName.trim()
  return FIELD_ALIASES[trimmed] ?? trimmed
}

export function isEventPhaseAStagingField(fieldName: string): boolean {
  const normalized = normalizeEventPhaseAFieldName(fieldName)
  return (
    (EVENT_PHASE_A_STAGING_FIELDS as readonly string[]).includes(normalized) &&
    isFieldAllowedForAgent('events', normalized)
  )
}

function parseLatLng(value: string): { lat: number; lng: number } | null {
  const parts = value.split(',').map((p) => p.trim())
  if (parts.length !== 2) return null
  const lat = Number(parts[0])
  const lng = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/** Turn a proposed string value into the shape Events expects on commit. */
export function normalizeEventPhaseAStagedValue(fieldName: string, rawValue: string): unknown {
  const field = normalizeEventPhaseAFieldName(fieldName)
  const value = rawValue.trim()

  if (field === 'venueLatLng') {
    const coords = parseLatLng(value)
    if (!coords) {
      throw new Error('venueLatLng must be "lat, lng" with numeric coordinates.')
    }
    return coords
  }

  if (field === 'sameAs') {
    return [{ uri: value }]
  }

  if (field === 'endDate' || field === 'startDate' || field === 'openingDate') {
    const parsed = Date.parse(value)
    if (!Number.isFinite(parsed)) {
      throw new Error(`${field} must be a valid ISO date string.`)
    }
    return new Date(parsed).toISOString()
  }

  return value
}

export function isEventReflectiveStagingField(fieldName: string): boolean {
  const field = normalizeEventPhaseAFieldName(fieldName)
  return isFieldAllowedForAgent('events', field) && !isEventPhaseAStagingField(field)
}

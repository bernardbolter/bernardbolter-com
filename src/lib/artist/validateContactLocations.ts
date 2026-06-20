import { APIError } from 'payload'

type LocationRow = {
  id?: string | null
  type?: string | null
  showOnContactPage?: boolean | null
  mapImage?: unknown
}

function hasMapImage(mapImage: unknown): boolean {
  if (mapImage == null || mapImage === '') return false
  if (typeof mapImage === 'number') return true
  if (typeof mapImage === 'object') {
    const media = mapImage as { id?: unknown; url?: unknown }
    return Boolean(media.id || media.url)
  }
  return false
}

/** Merge incoming array rows with the saved document so partial admin saves keep upload IDs. */
export function mergeLocationRows(incoming: unknown, original: unknown): LocationRow[] {
  if (!Array.isArray(incoming)) {
    return Array.isArray(original) ? (original as LocationRow[]) : []
  }
  if (!Array.isArray(original)) return incoming as LocationRow[]

  const originalById = new Map<string, LocationRow>()
  for (const row of original) {
    if (row && typeof row === 'object' && (row as LocationRow).id != null) {
      originalById.set(String((row as LocationRow).id), row as LocationRow)
    }
  }

  return (incoming as LocationRow[]).map((row) => {
    if (!row?.id) return row
    const previous = originalById.get(String(row.id))
    return previous ? { ...previous, ...row } : row
  })
}

export function validateContactLocations(locations: unknown): void {
  if (!Array.isArray(locations)) return

  for (const row of locations) {
    if (!row || typeof row !== 'object') continue
    const location = row as LocationRow

    if (location.showOnContactPage !== true) continue

    if (location.type === 'residence') {
      throw new APIError(
        'This location is typed as Residence, so it cannot appear on the contact page. Change the type to Studio or Live-work, then save again.',
        400,
      )
    }

    if (!hasMapImage(location.mapImage)) {
      throw new APIError(
        'Upload a map image before enabling “Show on contact page” for this location.',
        400,
      )
    }
  }
}

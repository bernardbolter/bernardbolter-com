import type { WikidataEntitySummary } from './externalLookups/wikidata'

/** Row shape for megacities.composition.locations[] (partial). */
export type MegacitiesLocationRow = {
  name?: string
  slug?: string
  country?: string
  region?: string
  population?: number
  populationYear?: string
  wikidataUri?: string
  coordinates?: { lat?: number; lng?: number }
  [key: string]: unknown
}

export function applyWikidataToMegacitiesLocation(
  row: MegacitiesLocationRow,
  entity: WikidataEntitySummary,
): MegacitiesLocationRow {
  const out: MegacitiesLocationRow = { ...row, wikidataUri: entity.uri }

  if (entity.label && !out.name?.trim()) {
    out.name = entity.label
  }
  if (entity.population != null && out.population == null) {
    out.population = entity.population
  }
  if (entity.populationYear && !out.populationYear?.trim()) {
    out.populationYear = entity.populationYear
  }
  if (entity.coordinates) {
    const lat = out.coordinates?.lat ?? entity.coordinates.lat
    const lng = out.coordinates?.lng ?? entity.coordinates.lng
    out.coordinates = { lat, lng }
  }

  return out
}

/** Merge Wikidata facts into the matching locations[] row by name (case-insensitive). */
export function mergeMegacitiesLocationWikidata(
  locations: MegacitiesLocationRow[],
  locationName: string,
  entity: WikidataEntitySummary,
): MegacitiesLocationRow[] {
  const key = locationName.trim().toLowerCase()
  if (!key) return locations

  let matched = false
  const next = locations.map((row) => {
    if (row.name?.trim().toLowerCase() !== key) return row
    matched = true
    return applyWikidataToMegacitiesLocation(row, entity)
  })

  if (!matched) {
    next.push(
      applyWikidataToMegacitiesLocation(
        { name: locationName.trim() },
        entity,
      ),
    )
  }

  return next
}

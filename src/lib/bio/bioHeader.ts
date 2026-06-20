import type { Artist } from '@/payload-types'

/** Current location cities — primary entries first, then other current rows. */
export function getBioCurrentCities(artist: Artist): string[] {
  const rows = (artist.locations ?? []).filter((row) => row?.city?.trim() && row.current !== false)
  const primary = rows.filter((row) => row.primary).map((row) => row.city.trim())
  const other = rows.filter((row) => !row.primary).map((row) => row.city.trim())
  const ordered = [...primary, ...other]

  return ordered.filter((city, index) => ordered.indexOf(city) === index)
}

function formatCityList(cities: string[]): string {
  if (cities.length === 0) return ''
  if (cities.length === 1) return cities[0]
  if (cities.length === 2) return `${cities[0]} and ${cities[1]}`
  return `${cities.slice(0, -1).join(', ')}, and ${cities[cities.length - 1]}`
}

export function formatBioBirthLine(artist: Artist): string | null {
  const city = artist.birthCity?.trim()
  const year = artist.birthYear
  if (!city && !year) return null
  if (city && year) return `b. ${city}, ${year}`
  if (city) return `b. ${city}`
  return `b. ${year}`
}

export function formatBioLivesAndWorksLine(artist: Artist): string | null {
  const cities = getBioCurrentCities(artist)
  if (cities.length === 0) {
    const fallback = [artist.workCity1?.trim(), artist.workCity2?.trim()].filter(Boolean) as string[]
    if (fallback.length === 0) return null
    return `Lives and works ${formatCityList(fallback)}`
  }
  return `Lives and works ${formatCityList(cities)}`
}

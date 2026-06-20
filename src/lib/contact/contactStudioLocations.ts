import type { Artist, Media } from '@/payload-types'
import { resolveMediaUrl } from '@/lib/studio/media'

export type ContactPageLocation = NonNullable<Artist['locations']>[number]

export type ContactStudioLocation = {
  id: string
  city: string
  country: string
  streetAddress?: string
  buildingName?: string
  mapLinkUrl?: string
  mapImageUrl: string
  mapImageWidth: number
  mapImageHeight: number
  mapAlt: string
}

function resolveMapImage(
  mapImage: number | Media | null | undefined,
): { url: string; width: number; height: number; alt: string } | null {
  if (!mapImage) return null

  if (typeof mapImage === 'number') return null

  const media = mapImage as Media
  const url = resolveMediaUrl(media)
  if (!url) return null

  return {
    url,
    width: media.width ?? 800,
    height: media.height ?? 500,
    alt: media.alt?.trim() || 'Studio location map',
  }
}

/** Public contact-page locations — shared by ContactStudios and contact JSON-LD. */
export function getContactPagePublicLocations(artist: Artist): ContactPageLocation[] {
  return (artist.locations ?? []).filter(
    (location) =>
      location.showOnContactPage === true &&
      location.type !== 'residence' &&
      Boolean(location.id),
  )
}

/** Studio cards — public locations that also have a resolvable map image. */
export function getContactStudioLocations(artist: Artist): ContactStudioLocation[] {
  return getContactPagePublicLocations(artist)
    .map((location) => {
      const map = resolveMapImage(location.mapImage)
      if (!map) return null

      const buildingName = location.buildingName?.trim()
      const streetAddress = location.streetAddress?.trim()
      const mapLinkUrl = location.mapLinkUrl?.trim()

      return {
        id: location.id as string,
        city: location.city,
        country: location.country,
        streetAddress: streetAddress || undefined,
        buildingName: buildingName || undefined,
        mapLinkUrl: mapLinkUrl || undefined,
        mapImageUrl: map.url,
        mapImageWidth: map.width,
        mapImageHeight: map.height,
        mapAlt: buildingName ? `Map of ${buildingName}` : `Map of ${location.city}`,
      }
    })
    .filter((location): location is ContactStudioLocation => location !== null)
}

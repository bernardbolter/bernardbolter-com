import type { Artist } from '@/payload-types'
import type { ArtistInfoData, ArtistInfoLink, ArtistSocialLinks } from '@/types/frontend'

import { getBioCurrentCities } from '@/lib/bio/bioHeader'
import { normalizeSocialUrl } from '@/utilities/normalizeSocialUrl'

const INFO_PANEL_DEFAULTS: ArtistInfoData = {
  name: 'Bernard Bolter',
  birthCity: 'San Francisco',
  birthYear: 1974,
  workCity1: 'Berlin',
  workCity2: 'San Francisco',
}

const DEFAULT_WEBSITE_LINKS: ArtistInfoLink[] = [
  { label: 'acolorfulhistory.com', url: 'https://acolorfulhistory.com' },
  { label: 'digitalcityseries.com', url: 'https://digitalcityseries.com' },
  { label: 'smoothism.com', url: 'https://smoothism.com' },
]

function normalizeWebsiteLinks(artist: Artist): ArtistInfoLink[] {
  const rows = artist.otherLinks ?? []
  const links = rows
    .map((row) => ({
      label: row.label?.trim() ?? '',
      url: row.url?.trim() ?? '',
    }))
    .filter((row) => row.label && row.url)

  return links.length > 0 ? links : DEFAULT_WEBSITE_LINKS
}

function mapSocialLinks(artist: Artist): ArtistSocialLinks {
  const social: ArtistSocialLinks = {}
  const channels = artist.socialChannels ?? {}
  const instagram = channels.instagram?.trim()
  const tiktok = channels.tiktok?.trim()
  const youtube = channels.youtube?.trim()
  const linkedin = channels.linkedin?.trim()

  const instagramUrl = normalizeSocialUrl(instagram, 'instagram')
  const tiktokUrl = normalizeSocialUrl(tiktok, 'tiktok')
  const youtubeUrl = normalizeSocialUrl(youtube, 'youtube')
  const linkedinUrl = normalizeSocialUrl(linkedin, 'linkedin')

  if (instagramUrl) social.instagram = instagramUrl
  if (tiktokUrl) social.tiktok = tiktokUrl
  if (youtubeUrl) social.youtube = youtubeUrl
  if (linkedinUrl) social.linkedin = linkedinUrl

  return social
}

function resolveWorkCities(artist: Artist): { workCity1: string; workCity2?: string } {
  const fromLocations = getBioCurrentCities(artist)
  const explicit = [artist.workCity1?.trim(), artist.workCity2?.trim()].filter(Boolean) as string[]
  const merged = fromLocations.length > 0 ? fromLocations : explicit
  const unique = merged.filter((city, index) => merged.indexOf(city) === index)

  return {
    workCity1: unique[0] || 'Berlin',
    workCity2: unique[1],
  }
}

/** Maps Payload artist record to Info panel fields (with legacy fallbacks). */
export function mapArtistToInfoData(artist: Artist | null | undefined): ArtistInfoData {
  if (!artist) {
    return {
      ...INFO_PANEL_DEFAULTS,
      websiteLinks: DEFAULT_WEBSITE_LINKS,
      socialLinks: {},
    }
  }

  const workCities = resolveWorkCities(artist)

  return {
    name: artist.name?.trim() || INFO_PANEL_DEFAULTS.name,
    birthCity: artist.birthCity?.trim() || INFO_PANEL_DEFAULTS.birthCity,
    birthYear: artist.birthYear ?? INFO_PANEL_DEFAULTS.birthYear,
    workCity1: workCities.workCity1,
    workCity2: workCities.workCity2,
    websiteLinks: normalizeWebsiteLinks(artist),
    socialLinks: mapSocialLinks(artist),
  }
}

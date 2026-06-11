import type { Artist } from '@/payload-types'
import type { ArtistInfoData, ArtistInfoLink, ArtistSocialLinks } from '@/types/frontend'

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
  const instagram = artist.instagramUrl?.trim()
  const tiktok = artist.tiktokUrl?.trim()
  const youtube = artist.youtubeUrl?.trim()
  const linkedin = artist.linkedinUrl?.trim()

  if (instagram) social.instagram = instagram
  if (tiktok) social.tiktok = tiktok
  if (youtube) social.youtube = youtube
  if (linkedin) social.linkedin = linkedin

  return social
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

  const currentCities = (artist.locations ?? [])
    .filter((row) => row?.city && row.current !== false)
    .map((row) => row.city.trim())

  return {
    name: artist.name?.trim() || INFO_PANEL_DEFAULTS.name,
    birthCity: artist.birthCity?.trim() || INFO_PANEL_DEFAULTS.birthCity,
    birthYear: artist.birthYear ?? INFO_PANEL_DEFAULTS.birthYear,
    workCity1: artist.workCity1?.trim() || currentCities[0] || INFO_PANEL_DEFAULTS.workCity1,
    workCity2: artist.workCity2?.trim() || currentCities[1] || INFO_PANEL_DEFAULTS.workCity2,
    websiteLinks: normalizeWebsiteLinks(artist),
    socialLinks: mapSocialLinks(artist),
  }
}

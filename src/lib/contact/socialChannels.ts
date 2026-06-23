import type { Artist } from '@/payload-types'
import { normalizeSocialUrl, type SocialPlatform } from '@/utilities/normalizeSocialUrl'

export const SOCIAL_CHANNEL_KEYS = [
  'instagram',
  'facebook',
  'youtube',
  'vimeo',
  'linkedin',
  'tiktok',
] as const

export type SocialChannelKey = (typeof SOCIAL_CHANNEL_KEYS)[number]

export const SOCIAL_CHANNEL_LABELS: Record<SocialChannelKey, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
}

export type PopulatedSocialChannel = {
  key: SocialChannelKey
  url: string
  label: string
}

function resolveSocialChannelUrl(
  artist: Artist,
  key: SocialChannelKey,
): string | null {
  const raw = artist.socialChannels?.[key]
  return normalizeSocialUrl(raw, key as SocialPlatform)
}

export function getPopulatedSocialChannels(artist: Artist): PopulatedSocialChannel[] {
  return SOCIAL_CHANNEL_KEYS.flatMap((key) => {
    const url = resolveSocialChannelUrl(artist, key)
    if (!url) return []
    return [{ key, url, label: SOCIAL_CHANNEL_LABELS[key] }]
  })
}

export function getSocialChannelUrl(
  artist: Artist,
  key: SocialChannelKey | null | undefined,
): string | null {
  if (!key) return null
  return resolveSocialChannelUrl(artist, key)
}

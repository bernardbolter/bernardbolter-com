import type { Artist } from '@/payload-types'

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

export function getPopulatedSocialChannels(artist: Artist): PopulatedSocialChannel[] {
  const channels = artist.socialChannels ?? {}
  return SOCIAL_CHANNEL_KEYS.flatMap((key) => {
    const url = channels[key]?.trim()
    if (!url) return []
    return [{ key, url, label: SOCIAL_CHANNEL_LABELS[key] }]
  })
}

export function getSocialChannelUrl(
  artist: Artist,
  key: SocialChannelKey | null | undefined,
): string | null {
  if (!key) return null
  const url = artist.socialChannels?.[key]?.trim()
  return url || null
}

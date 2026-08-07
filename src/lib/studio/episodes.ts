import type { Payload } from 'payload'

import type { Episode, User } from '@/payload-types'

const SERIES_ORDER = [
  'outsider-art-review',
  'rap-critic',
  'studio-fails',
  'studio-series',
] as const

export async function listStudioEpisodes(payload: Payload, user: User) {
  return payload.find({
    collection: 'episodes',
    sort: '-updatedAt',
    limit: 100,
    depth: 0,
    overrideAccess: false,
    user,
  })
}

export function groupEpisodesBySeries(episodes: Episode[]) {
  const groups = new Map<string, Episode[]>()
  for (const series of SERIES_ORDER) {
    groups.set(series, [])
  }
  for (const episode of episodes) {
    const list = groups.get(episode.series) ?? []
    list.push(episode)
    groups.set(episode.series, list)
  }
  return SERIES_ORDER.map((series) => ({
    series,
    episodes: groups.get(series) ?? [],
  })).filter((g) => g.episodes.length > 0)
}

export async function getStudioEpisode(payload: Payload, user: User, id: number) {
  return payload.findByID({
    collection: 'episodes',
    id,
    depth: 1,
    overrideAccess: false,
    user,
  })
}

export async function listEpisodeClips(payload: Payload, user: User, episodeId: number) {
  const { docs } = await payload.find({
    collection: 'field-notes',
    where: { relatedEpisode: { equals: episodeId } },
    sort: '-capturedAt',
    limit: 100,
    depth: 1,
    overrideAccess: false,
    user,
  })
  return docs
}

export async function createStudioEpisode(
  payload: Payload,
  user: User,
  input: {
    title: string
    series: Episode['series']
    concept?: string
    description?: string
    locationName?: string
    location?: { lat: number; lng: number }
    coverPhotoId?: number
  },
) {
  return payload.create({
    collection: 'episodes',
    data: {
      title: input.title.trim(),
      series: input.series,
      concept: input.concept?.trim(),
      description: input.description?.trim(),
      locationName: input.locationName?.trim(),
      location: input.location,
      coverPhoto: input.coverPhotoId,
      status: 'concept',
    },
    overrideAccess: false,
    user,
  })
}

export const RAP_CRITIC_TIKTOK_PRESET_NAME = 'Rap Critic — TikTok'

export async function findCapturePresetByName(
  payload: Payload,
  user: User,
  name: string,
): Promise<number | null> {
  const { docs } = await payload.find({
    collection: 'capture-presets',
    where: { name: { equals: name } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  return docs[0]?.id ?? null
}

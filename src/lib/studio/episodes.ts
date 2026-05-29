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
  input: { title: string; series: Episode['series']; concept?: string },
) {
  return payload.create({
    collection: 'episodes',
    data: {
      title: input.title.trim(),
      series: input.series,
      concept: input.concept?.trim(),
      status: 'concept',
    },
    overrideAccess: false,
    user,
  })
}

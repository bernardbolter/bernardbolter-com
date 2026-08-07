import { notFound } from 'next/navigation'

import { EpisodeDetail } from '@/components/studio/EpisodeDetail'
import { getStudioPayload } from '@/lib/studio/getStudioPayload'
import {
  findCapturePresetByName,
  getStudioEpisode,
  listEpisodeClips,
  RAP_CRITIC_TIKTOK_PRESET_NAME,
} from '@/lib/studio/episodes'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EpisodeDetailPage({ params }: PageProps) {
  const { id } = await params
  const episodeId = Number(id)
  if (!Number.isFinite(episodeId)) notFound()

  const { payload, user } = await getStudioPayload()
  let episode
  try {
    episode = await getStudioEpisode(payload, user, episodeId)
  } catch {
    notFound()
  }

  const [clips, rapCriticPresetId] = await Promise.all([
    listEpisodeClips(payload, user, episodeId),
    findCapturePresetByName(payload, user, RAP_CRITIC_TIKTOK_PRESET_NAME),
  ])

  return (
    <section>
      <EpisodeDetail
        episode={episode}
        clips={clips}
        rapCriticPresetId={rapCriticPresetId}
      />
    </section>
  )
}

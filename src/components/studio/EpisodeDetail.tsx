import Link from 'next/link'

import type { Episode, FieldNote, Media } from '@/payload-types'
import { resolveMediaUrl } from '@/lib/studio/media'

import { EpisodeBeatUpload } from './EpisodeBeatUpload'
import { EpisodeChatPanel } from './EpisodeChatPanel'
import { EpisodeClipUpload } from './EpisodeClipUpload'
import { EpisodeEdlDownload } from './EpisodeEdlDownload'
import { FieldNoteCard } from './FieldNoteCard'

type EpisodeDetailProps = {
  episode: Episode
  clips: FieldNote[]
  rapCriticPresetId: number | null
}

function coverSrc(episode: Episode): string | null {
  const cover = episode.coverPhoto
  if (!cover || typeof cover === 'number') return null
  return resolveMediaUrl(cover as Media)
}

function beatEntries(episode: Episode): { url: string; label: string }[] {
  const entries: { url: string; label: string }[] = []
  for (const [index, row] of (episode.beatTracks ?? []).entries()) {
    const media = row.track && typeof row.track === 'object' ? (row.track as Media) : null
    const url = resolveMediaUrl(media)
    if (!url) continue
    entries.push({
      url,
      label: row.label?.trim() || `Beat ${index + 1}`,
    })
  }
  return entries
}

export function EpisodeDetail({ episode, clips, rapCriticPresetId }: EpisodeDetailProps) {
  const image = coverSrc(episode)
  const beats = beatEntries(episode)
  const isRapCritic = episode.series === 'rap-critic'
  const hasPin = episode.location?.lat != null && episode.location?.lng != null

  return (
    <article className="studio-detail">
      <header className="studio-detail__header">
        <h2>{episode.title}</h2>
        <p>
          {episode.series.replace(/-/g, ' ')} · {episode.status}
          {episode.locationName ? ` · ${episode.locationName}` : ''}
        </p>
        <Link href={`/admin/collections/episodes/${episode.id}`} className="studio-detail__admin">
          Open in admin →
        </Link>
      </header>

      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="studio-detail__hero" />
      ) : null}

      {episode.description ? (
        <section>
          <h3>Description</h3>
          <p>{episode.description}</p>
        </section>
      ) : null}

      {hasPin || episode.locationName ? (
        <section>
          <h3>Location</h3>
          {episode.locationName ? <p>{episode.locationName}</p> : null}
          {hasPin ? (
            <p className="studio-muted">
              {Number(episode.location!.lat).toFixed(5)}, {Number(episode.location!.lng).toFixed(5)}
            </p>
          ) : null}
        </section>
      ) : null}

      {episode.concept ? (
        <section>
          <h3>Concept</h3>
          <p>{episode.concept}</p>
        </section>
      ) : null}

      {isRapCritic ? (
        <section>
          <h3>Beat tracks ({beats.length}/3)</h3>
          {beats.length === 0 ? (
            <p className="studio-muted">No beats yet — upload below, or with a freestyle take.</p>
          ) : (
            <ul>
              {beats.map((beat) => (
                <li key={beat.url}>
                  <p>{beat.label}</p>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio controls src={beat.url} className="studio-timelapse" />
                </li>
              ))}
            </ul>
          )}
          <EpisodeBeatUpload episodeId={episode.id} beatTrackCount={episode.beatTracks?.length ?? 0} />
        </section>
      ) : null}

      <section>
        <h3>Upload clip</h3>
        <p className="studio-muted">
          ARRIVE / HOOK / VERSE / DEPART — Whisper-only via Rap Critic — TikTok preset.
          Freestyle (VERSE) takes front + rear together; optional beat appends to the episode (max 3).
          .mov / HEVC clips are transcoded to MP4 on upload for preview.
        </p>
        <EpisodeClipUpload
          episodeId={episode.id}
          capturePresetId={rapCriticPresetId}
          beatTrackCount={episode.beatTracks?.length ?? 0}
          clips={clips.map((clip) => ({
            shotType: clip.shotType,
            take: clip.take,
            cameraAngle: clip.cameraAngle,
          }))}
        />
      </section>

      <section>
        <h3>Clips ({clips.length})</h3>
        {clips.length === 0 ? (
          <p className="studio-muted">No clips linked yet.</p>
        ) : (
          <ul className="studio-card-grid">
            {clips.map((clip) => (
              <li key={clip.id}>
                <FieldNoteCard note={clip} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Storyboard</h3>
        {episode.storyboard?.length ? (
          <ul>
            {episode.storyboard.map((beat) => (
              <li key={beat.id ?? beat.name}>
                <strong>{beat.name}</strong>
                {beat.mediaType ? ` · ${beat.mediaType}` : ''}
                {beat.notes ? <p>{beat.notes}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="studio-muted">No beats yet.</p>
        )}
        <EpisodeChatPanel episodeId={episode.id} sessionType="episode-storyboard" />
      </section>

      <section>
        <h3>Assembly</h3>
        {episode.assembly?.length ? (
          <ul>
            {episode.assembly.map((row) => (
              <li key={row.id ?? row.beatName}>
                {row.beatName ?? 'Beat'}
                {row.clipFieldNoteId ? ` · clip #${row.clipFieldNoteId}` : ''}
                {row.notes ? <p>{row.notes}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="studio-muted">No assembly map yet.</p>
        )}
        <EpisodeEdlDownload
          episodeId={episode.id}
          hasAssemblyClips={Boolean(
            episode.assembly?.some(
              (row) => typeof row.clipFieldNoteId === 'number' && row.clipFieldNoteId > 0,
            ),
          )}
        />
        <EpisodeChatPanel episodeId={episode.id} sessionType="episode-assembly" />
      </section>
    </article>
  )
}

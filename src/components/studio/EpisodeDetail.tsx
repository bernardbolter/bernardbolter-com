import Link from 'next/link'

import type { Episode, FieldNote, Media } from '@/payload-types'
import { resolveMediaUrl } from '@/lib/studio/media'

import { EpisodeChatPanel } from './EpisodeChatPanel'
import { EpisodeClipUpload } from './EpisodeClipUpload'
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

export function EpisodeDetail({ episode, clips, rapCriticPresetId }: EpisodeDetailProps) {
  const image = coverSrc(episode)
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

      <section>
        <h3>Upload clip</h3>
        <p className="studio-muted">
          ARRIVE / HOOK / VERSE / DEPART — Whisper-only via Rap Critic — TikTok preset.
        </p>
        <EpisodeClipUpload
          episodeId={episode.id}
          capturePresetId={rapCriticPresetId}
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
        <EpisodeChatPanel episodeId={episode.id} sessionType="episode-assembly" />
      </section>
    </article>
  )
}

import Link from 'next/link'

import type { Episode, FieldNote } from '@/payload-types'

import { FieldNoteCard } from './FieldNoteCard'
import { EpisodeChatPanel } from './EpisodeChatPanel'

type EpisodeDetailProps = {
  episode: Episode
  clips: FieldNote[]
}

export function EpisodeDetail({ episode, clips }: EpisodeDetailProps) {
  return (
    <article className="studio-detail">
      <header className="studio-detail__header">
        <h2>{episode.title}</h2>
        <p>
          {episode.series.replace(/-/g, ' ')} · {episode.status}
        </p>
        <Link href={`/admin/collections/episodes/${episode.id}`} className="studio-detail__admin">
          Open in admin →
        </Link>
      </header>

      {episode.concept ? (
        <section>
          <h3>Concept</h3>
          <p>{episode.concept}</p>
        </section>
      ) : null}

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

      <section>
        <h3>Clips ({clips.length})</h3>
        {clips.length === 0 ? (
          <p className="studio-muted">Tag FieldNotes to this episode from Upload or Notes.</p>
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
    </article>
  )
}

import Link from 'next/link'

import type { Episode } from '@/payload-types'

type EpisodeCardProps = {
  episode: Episode
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <Link href={`/studio/episodes/${episode.id}`} className="studio-episode-card">
      <div>
        <h3>{episode.title}</h3>
        <p className="studio-note-card__meta">
          {episode.series.replace(/-/g, ' ')} · {episode.status}
        </p>
        {episode.concept ? <p>{episode.concept.slice(0, 100)}</p> : null}
      </div>
    </Link>
  )
}

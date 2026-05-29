import Link from 'next/link'

import { EpisodeCard } from '@/components/studio/EpisodeCard'
import { getStudioPayload } from '@/lib/studio/getStudioPayload'
import { groupEpisodesBySeries, listStudioEpisodes } from '@/lib/studio/episodes'

function seriesLabel(series: string): string {
  return series.replace(/-/g, ' ')
}

export default async function StudioEpisodesPage() {
  const { payload, user } = await getStudioPayload()
  const { docs } = await listStudioEpisodes(payload, user)
  const groups = groupEpisodesBySeries(docs)

  return (
    <section>
      <header className="studio-page-header">
        <h2>Episodes</h2>
        <Link href="/studio/episodes/new" className="studio-page-header__action">
          New episode
        </Link>
      </header>
      {groups.length === 0 ? (
        <p className="studio-muted">No episodes yet. Create one to start storyboarding.</p>
      ) : (
        groups.map(({ series, episodes }) => (
          <section key={series} className="studio-episode-group">
            <h3>{seriesLabel(series)}</h3>
            <ul className="studio-card-grid">
              {episodes.map((episode) => (
                <li key={episode.id}>
                  <EpisodeCard episode={episode} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  )
}

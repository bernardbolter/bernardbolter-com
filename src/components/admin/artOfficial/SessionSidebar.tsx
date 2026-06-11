'use client'

import { primaryImageMediaIdFromTimeline } from '@/lib/artOfficial/primaryImageFromTimeline'
import { collapseTimelineToLatest } from '@/lib/artOfficial/sessionTimeline'

import { StagedArtworkPreview } from './StagedArtworkPreview'
import type { TimelineEntry } from './types'

import './artOfficialChat.scss'

function truncate(value: unknown, max = 80): string {
  const s = typeof value === 'string' ? value : JSON.stringify(value)
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function TimelineGroup({
  title,
  entries,
}: {
  title: string
  entries: TimelineEntry[]
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h4 className="art-official-sidebar__group-title">{title}</h4>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {entries.map((e, i) => (
          <li key={i} className="art-official-sidebar__entry">
            <div className="art-official-sidebar__entry-meta">
              <code className="art-official-sidebar__field">
                {e.targetCollection === 'practice-knowledge' ? `pk:${e.field}` : e.field}
              </code>
              <span className="art-official-sidebar__pill">{e.confidence ?? '?'}</span>
              <span className="art-official-sidebar__pill">{e.source ?? '?'}</span>
            </div>
            <div className="art-official-sidebar__entry-value">{truncate(e.value)}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function displayEntries(entries: TimelineEntry[], hidePrimaryImageId: boolean): TimelineEntry[] {
  if (!hidePrimaryImageId) return entries
  return entries.filter(
    (e) => !(e.targetCollection === 'artworks' && e.field === 'primaryImage'),
  )
}

export function SessionSidebar({
  timeline,
  sessionType,
}: {
  timeline: TimelineEntry[]
  sessionType: string
}) {
  const primaryMediaId =
    sessionType === 'artwork-cataloguing' ? primaryImageMediaIdFromTimeline(timeline) : null

  const displayTimeline = collapseTimelineToLatest(timeline)

  const grouped = displayTimeline.reduce<Record<string, TimelineEntry[]>>((acc, entry) => {
    const key = entry.targetCollection ?? 'session'
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})

  return (
    <aside className="art-official-sidebar">
      <div className="art-official-sidebar__head">
        <h3 className="art-official-sidebar__title">Staged fields</h3>
        <p className="art-official-sidebar__hint">
          {sessionType === 'onboarding'
            ? 'Onboarding commits practice-knowledge (pk:…) sections only.'
            : sessionType === 'biography'
              ? 'Biography commits bioFull / bioMedium / bioShort on your Artist record.'
              : sessionType === 'artist-statement'
                ? 'Statement commits statementFull / statementMedium / statementShort on Artist.'
                : sessionType === 'triptych-cataloguing'
                  ? 'Triptych commits corpus fields on Triptychs (panels and commerce stay in admin).'
                  : sessionType === 'event-enrichment'
                    ? 'Event enrichment commits staged fields on the linked Events record.'
                    : `${sessionType} — committed at confirmation only.`}
        </p>
      </div>
      <div className="art-official-sidebar__fields">
        {displayTimeline.length === 0 ? (
          <p className="art-official-sidebar__empty">No staged updates yet.</p>
        ) : (
          Object.entries(grouped).map(([collection, entries]) => (
            <TimelineGroup
              key={collection}
              title={collection}
              entries={displayEntries(entries, primaryMediaId != null)}
            />
          ))
        )}
      </div>
      {primaryMediaId != null ? (
        <div className="art-official-sidebar__preview-dock">
          <StagedArtworkPreview mediaId={primaryMediaId} />
        </div>
      ) : null}
    </aside>
  )
}

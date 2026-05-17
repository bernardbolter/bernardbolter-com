'use client'

import './artOfficialChat.scss'

import type { TimelineEntry } from './types'

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

export function SessionSidebar({
  timeline,
  sessionType,
}: {
  timeline: TimelineEntry[]
  sessionType: string
}) {
  const grouped = timeline.reduce<Record<string, TimelineEntry[]>>((acc, entry) => {
    const key = entry.targetCollection ?? 'session'
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})

  return (
    <aside className="art-official-sidebar">
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
                : `${sessionType} — committed at confirmation only.`}
      </p>
      {timeline.length === 0 ? (
        <p style={{ opacity: 0.5 }}>No staged updates yet.</p>
      ) : (
        Object.entries(grouped).map(([collection, entries]) => (
          <TimelineGroup key={collection} title={collection} entries={entries} />
        ))
      )}
    </aside>
  )
}

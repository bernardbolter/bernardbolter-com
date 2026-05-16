'use client'

import type { TimelineEntry } from './types'

function truncate(value: unknown, max = 80): string {
  const s = typeof value === 'string' ? value : JSON.stringify(value)
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function Pill({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        marginLeft: 6,
        padding: '1px 6px',
        fontSize: 10,
        borderRadius: 3,
        background: 'var(--theme-elevation-200)',
      }}
    >
      {label}
    </span>
  )
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
      <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase' }}>
        {title}
      </h4>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {entries.map((e, i) => (
          <li
            key={i}
            style={{
              marginBottom: 8,
              padding: 8,
              background: 'var(--theme-elevation-50)',
              borderRadius: 4,
            }}
          >
            <code style={{ fontSize: 11 }}>{e.field}</code>
            <Pill label={e.confidence ?? '?'} />
            <Pill label={e.source ?? '?'} />
            <div style={{ marginTop: 4, opacity: 0.85 }}>{truncate(e.value)}</div>
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
    <aside
      style={{
        borderLeft: '1px solid var(--theme-elevation-150)',
        paddingLeft: 16,
        fontSize: 13,
      }}
    >
      <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Staged fields</h3>
      <p style={{ margin: '0 0 16px', opacity: 0.65, fontSize: 12 }}>
        {sessionType} — committed at confirmation only.
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

import Link from 'next/link'

import { buildStudioDigest, episodeBucketLabel } from '@/lib/studio/digest'

type DigestData = Awaited<ReturnType<typeof buildStudioDigest>>

export function DigestView({ data }: { data: DigestData }) {
  return (
    <div className="studio-digest">
      <section>
        <h3>Open paintings</h3>
        {data.openPaintings.length === 0 ? (
          <p className="studio-muted">No draft paintings.</p>
        ) : (
          <ul>
            {data.openPaintings.map((a) => (
              <li key={a.id}>
                <Link href={`/studio/paintings/${a.id}`}>{a.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Untagged field notes</h3>
        <p>
          {data.untaggedFieldNotesCount} untagged ·{' '}
          <Link href="/studio/notes?untagged=1">Review →</Link>
        </p>
        <p>
          {data.museumFieldNotesCount} museum-sourced ·{' '}
          <Link href="/studio/notes?museumSourced=1">Batch review →</Link>
        </p>
      </section>

      <section>
        <h3>Calendar gaps (next 7 days)</h3>
        {data.calendarGaps.length === 0 ? (
          <p className="studio-muted">No empty calendar days in the look-ahead window (or none created yet).</p>
        ) : (
          <ul>
            {data.calendarGaps.map((day) => (
              <li key={day.id}>{day.date}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Segment coverage</h3>
        {Object.keys(data.segmentCoverage).length === 0 ? (
          <p className="studio-muted">No finale segments yet.</p>
        ) : (
          <ul>
            {Object.entries(data.segmentCoverage).map(([status, count]) => (
              <li key={status}>
                {status}: {count}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Episodes in progress</h3>
        <ul>
          {Object.entries(data.episodeBuckets).map(([status, count]) => (
            <li key={status}>
              {episodeBucketLabel(status)}: {count}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Open sessions</h3>
        {data.openSessions.length === 0 ? (
          <p className="studio-muted">No in-progress Art/Official or episode sessions.</p>
        ) : (
          <ul>
            {data.openSessions.map((s) => (
              <li key={s.id}>
                {s.sessionType} · {(s.sessionId ?? '—').slice(0, 8)}…
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Active Lines</h3>
        <ul>
          {data.activeLines.map((line) => (
            <li key={line.id}>{line.name}</li>
          ))}
        </ul>
        {data.dormantLines.length > 0 ? (
          <>
            <h4>Dormant Lines (30+ days quiet)</h4>
            <ul>
              {data.dormantLines.map((line) => (
                <li key={line.id}>{line.name}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section>
        <h3>Line suggestions</h3>
        {data.lineSuggestions.length === 0 ? (
          <p className="studio-muted">No pending Line suggestions.</p>
        ) : (
          <ul>
            {data.lineSuggestions.map((note) => (
              <li key={note.id}>
                <Link href={`/studio/notes/${note.id}`}>
                  Note #{note.id} ({note.mediaType})
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Pattern report</h3>
        {data.latestPatternReport ? (
          <>
            <p>Week of {data.latestPatternReport.weekStart}</p>
            {data.latestPatternReport.digestSummary ? (
              <p>{data.latestPatternReport.digestSummary}</p>
            ) : null}
            <ul>
              {data.latestPatternReport.patterns?.map((p) => (
                <li key={p.id ?? p.label}>
                  {p.kind}: {p.label}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="studio-muted">No pattern reports yet.</p>
        )}
      </section>

      <section>
        <h3>Practice overview (this week)</h3>
        <p>{data.practiceOverview.notesThisWeek} notes captured</p>
        <h4>Register</h4>
        <ul>
          {Object.entries(data.practiceOverview.registerCounts).map(([k, v]) => (
            <li key={k}>
              {k}: {v}
            </li>
          ))}
        </ul>
        <h4>Process stage</h4>
        <ul>
          {Object.entries(data.practiceOverview.processStageCounts).map(([k, v]) => (
            <li key={k}>
              {k}: {v}
            </li>
          ))}
        </ul>
        <h4>Conceptual threads</h4>
        <ul>
          {Object.entries(data.practiceOverview.conceptualThreadCounts).map(([k, v]) => (
            <li key={k}>
              {k}: {v}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

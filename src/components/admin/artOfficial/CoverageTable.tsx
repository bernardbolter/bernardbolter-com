'use client'

import type { CoverageReport, FieldCoverage } from '@/lib/artOfficial/sessionCoverage'
import {
  ROADMAP_CATEGORY_LABELS,
  ROADMAP_CATEGORY_ORDER,
} from '@/lib/artOfficial/fieldCatalog'

import './artOfficialChat.scss'

const BUCKET_LABELS: Record<FieldCoverage['bucket'], string> = {
  confirmed: 'Confirmed',
  inferred: 'Inferred',
  filed_direct: 'Filed direct',
  staged_dropped: 'Staged dropped',
  unaddressed: 'Unaddressed',
  dormant: 'Dormant',
}

const BUCKET_CLASS: Record<FieldCoverage['bucket'], string> = {
  confirmed: 'art-official-audit__pill--ok',
  inferred: 'art-official-audit__pill--ok',
  filed_direct: 'art-official-audit__pill--neutral',
  staged_dropped: 'art-official-audit__pill--warn',
  unaddressed: 'art-official-audit__pill--warn',
  dormant: 'art-official-audit__pill--muted',
}

function AttentionRow({ row }: { row: FieldCoverage }) {
  return (
    <li className="art-official-audit__attention-row">
      <div className="art-official-audit__attention-head">
        <code className="art-official-sidebar__field">{row.field}</code>
        <span className="art-official-sidebar__pill">{row.category}</span>
      </div>
      {row.remediation ? (
        <p className="art-official-audit__remediation">
          <strong>{row.remediation.surface === 'cursor' ? 'Cursor' : 'Payload admin'}:</strong>{' '}
          {row.remediation.file} — {row.remediation.lever}
        </p>
      ) : null}
    </li>
  )
}

function FieldRow({ row }: { row: FieldCoverage }) {
  const muted = row.bucket === 'dormant'
  return (
    <tr className={muted ? 'art-official-audit__row--muted' : undefined}>
      <td>
        <code className="art-official-sidebar__field">{row.field}</code>
      </td>
      <td>
        <span className={`art-official-audit__pill ${BUCKET_CLASS[row.bucket]}`}>
          {BUCKET_LABELS[row.bucket]}
        </span>
      </td>
      <td>{row.source ?? '—'}</td>
      <td>{row.stagedAt ? new Date(row.stagedAt).toLocaleString() : '—'}</td>
      <td className="art-official-audit__preview">{row.filedPreview ?? '—'}</td>
    </tr>
  )
}

export function CoverageTable({ report }: { report: CoverageReport }) {
  const { summary } = report
  const tierLabel =
    report.careerStage.charAt(0).toUpperCase() + report.careerStage.slice(1)

  return (
    <div className="art-official-audit">
      <p className="art-official-audit__summary">
        {tierLabel} tier · {summary.expected} expected · {summary.confirmed} confirmed ·{' '}
        {summary.inferred} inferred · {summary.filedDirect} direct · {summary.stagedDropped}{' '}
        dropped · {summary.unaddressed} unaddressed · {summary.dormant} dormant
      </p>

      {(report.attention.unaddressed.length > 0 ||
        report.attention.stagedDropped.length > 0) && (
        <section className="art-official-audit__attention">
          <h3 className="art-official-sidebar__group-title">Attention</h3>
          {report.attention.stagedDropped.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <h4 className="art-official-audit__subhead">Staged but not committed</h4>
              <ul className="art-official-audit__attention-list">
                {report.attention.stagedDropped.map((row) => (
                  <AttentionRow key={row.field} row={row} />
                ))}
              </ul>
            </div>
          ) : null}
          {report.attention.unaddressed.length > 0 ? (
            <div>
              <h4 className="art-official-audit__subhead">Unaddressed in tier</h4>
              <ul className="art-official-audit__attention-list">
                {report.attention.unaddressed.map((row) => (
                  <AttentionRow key={row.field} row={row} />
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      {report.driftWarnings.length > 0 ? (
        <section className="art-official-audit__drift">
          <h3 className="art-official-sidebar__group-title">Catalog drift</h3>
          <ul>
            {report.driftWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="art-official-audit__quality">
        <h3 className="art-official-sidebar__group-title">Session quality</h3>
        <p>
          <strong>Weak phases:</strong>{' '}
          {report.quality.weakPhases.length > 0
            ? report.quality.weakPhases.join(', ')
            : '—'}
        </p>
        <p>
          <strong>Formal contribution:</strong>{' '}
          {report.quality.formalContributionAccuracy ?? '—'}
        </p>
        <p>
          <strong>Refinement flag:</strong>{' '}
          {report.quality.dialogueRefinementFlag ? 'Yes' : 'No'}
        </p>
        {report.quality.refinementNotes ? (
          <p>
            <strong>Refinement notes:</strong> {report.quality.refinementNotes}
          </p>
        ) : null}
      </section>

      {ROADMAP_CATEGORY_ORDER.map((category) => {
        const rows = report.fields.filter((f) => f.category === category)
        if (rows.length === 0) return null
        return (
          <section key={category} className="art-official-audit__group">
            <h3 className="art-official-sidebar__group-title">
              {ROADMAP_CATEGORY_LABELS[category]}
            </h3>
            <table className="art-official-audit__table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Bucket</th>
                  <th>Source</th>
                  <th>Staged at</th>
                  <th>Committed value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <FieldRow key={row.field} row={row} />
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
    </div>
  )
}

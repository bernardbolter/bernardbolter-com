import { resolveWorkStateLabel } from '@/lib/artwork/artworkLabels'
import type { Artwork } from '@/payload-types'

type Props = {
  artwork: Artwork
}

export default function Layer4History({ artwork }: Props) {
  const showWorkState =
    (artwork.workState && artwork.workState !== 'original') ||
    (Array.isArray(artwork.stateVersions) && artwork.stateVersions.length > 0)

  if (!showWorkState) return null

  return (
    <section className="artwork-page__layer artwork-page__layer--secondary">
      <div className="artwork-page__inner">
        <p className="artwork-page__status-section-label">Work state record</p>
        {resolveWorkStateLabel(artwork.workState) ? (
          <p className="artwork-page__prose">
            {resolveWorkStateLabel(artwork.workState)}
            {artwork.workStateDate ? ` · ${artwork.workStateDate}` : ''}
          </p>
        ) : null}
        {Array.isArray(artwork.stateVersions)
          ? artwork.stateVersions.map((row, index) => {
              if (!row || typeof row !== 'object') return null
              const record = row as Record<string, unknown>
              const description = String(record.description ?? record.note ?? '').trim()
              const date = String(record.date ?? '').trim()
              if (!description && !date) return null
              return (
                <p key={index} className="artwork-page__prose artwork-page__prose--secondary mt-2">
                  {[date, description].filter(Boolean).join(' — ')}
                </p>
              )
            })
          : null}
      </div>
    </section>
  )
}

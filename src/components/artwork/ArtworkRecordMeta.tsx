import { resolveRecordCataloguingLabel } from '@/lib/artwork/recordCataloguingLabel'
import { formatMonthYear } from '@/utilities/formatMonthYear'
import type { Artwork } from '@/payload-types'

/**
 * Catalogue identity + recency — sits with the machine JSON links at the
 * foot of the record column (below vision when present).
 */
export default function ArtworkRecordMeta({ artwork }: { artwork: Artwork }) {
  const reasoningLabel = resolveRecordCataloguingLabel(artwork)
  const lastUpdated = formatMonthYear(artwork.updatedAt)

  if (!artwork.catalogueNumber && !reasoningLabel && !lastUpdated) return null

  return (
    <div className="artwork-page__record-meta">
      {artwork.catalogueNumber ? (
        <p className="artwork-page__record-meta-line">{artwork.catalogueNumber}</p>
      ) : null}
      {reasoningLabel ? (
        <p className="artwork-page__record-meta-line">{reasoningLabel}</p>
      ) : null}
      {lastUpdated ? (
        <p className="artwork-page__record-meta-line">Last updated {lastUpdated}</p>
      ) : null}
    </div>
  )
}

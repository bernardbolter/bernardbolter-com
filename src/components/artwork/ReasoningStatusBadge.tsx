import type { Artwork } from '@/payload-types'

import { resolveRecordCataloguingLabel } from '@/lib/artwork/recordCataloguingLabel'

/** @deprecated Prefer resolveRecordCataloguingLabel — kept for transitional imports. */
export const reasoningStatusCopy: Record<NonNullable<Artwork['reasoningStatus']>, string> = {
  complete: 'Record fully catalogued via Art/Official',
  partial: 'Record partially catalogued',
  stub: 'Record not yet fully catalogued',
}

type Props = {
  artwork: Artwork
}

export default function ReasoningStatusBadge({ artwork }: Props) {
  const label = resolveRecordCataloguingLabel(artwork)
  if (!label) return null

  return <p className="reasoning-badge">{label}</p>
}

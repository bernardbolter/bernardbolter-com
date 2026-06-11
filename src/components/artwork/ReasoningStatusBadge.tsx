import type { Artwork } from '@/payload-types'

const COPY: Record<NonNullable<Artwork['reasoningStatus']>, string> = {
  complete: 'Record fully catalogued via Art/Official',
  partial: 'Record partially catalogued',
  stub: 'Record not yet fully catalogued',
}

type Props = {
  status: Artwork['reasoningStatus']
}

export default function ReasoningStatusBadge({ status }: Props) {
  if (!status) return null
  const label = COPY[status]
  if (!label) return null

  return <p className="reasoning-badge">{label}</p>
}

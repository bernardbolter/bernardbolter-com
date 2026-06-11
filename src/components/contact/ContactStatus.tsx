import type { Artist } from '@/payload-types'

const STATUS_LABELS: Record<NonNullable<Artist['contactStatus']>, string> = {
  available: 'Available',
  away: 'Away — slow to respond',
  unavailable: 'Not currently available',
}

const STATUS_DOT_CLASS: Record<NonNullable<Artist['contactStatus']>, string> = {
  available: 'bg-[var(--status-success)]',
  away: 'bg-[var(--status-warning)]',
  unavailable: 'bg-[var(--ui-line)]',
}

type Props = {
  artist: Artist
}

export default function ContactStatus({ artist }: Props) {
  const status = artist.contactStatus
  if (!status) return null

  const note = artist.contactStatusNote?.trim()

  return (
    <div className="mx-auto flex w-full max-w-[34.375rem] items-center gap-[0.625rem] py-[0.625rem]">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[status]}`}
        aria-hidden="true"
      />
      <p className="font-heading text-sm text-secondary">
        <span>{STATUS_LABELS[status]}</span>
        {note ? <span className="text-muted"> — {note}</span> : null}
      </p>
    </div>
  )
}

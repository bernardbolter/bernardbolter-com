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
    <div className="mt-[1.5rem]">
      <div className="flex items-center gap-[0.625rem]">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[status]}`}
          aria-hidden="true"
        />
        <p className="font-heading text-sm font-semibold text-[var(--text-medium)]">
          {STATUS_LABELS[status]}
        </p>
      </div>
      {note ? (
        <p className="mt-[0.25rem] font-heading text-[0.8125rem] text-muted">{note}</p>
      ) : null}
    </div>
  )
}

import Link from 'next/link'

import type { FieldNote, Media } from '@/payload-types'

import { resolveMediaUrl } from '@/lib/studio/media'

type ProcessTimelineProps = {
  notes: FieldNote[]
}

export function ProcessTimeline({ notes }: ProcessTimelineProps) {
  if (notes.length === 0) {
    return <p className="studio-muted">No process notes linked yet. Tag uploads from the Upload tab.</p>
  }

  return (
    <ul className="studio-timeline">
      {notes.map((note) => {
        const media =
          note.mediaFile && typeof note.mediaFile === 'object'
            ? (note.mediaFile as Media)
            : null
        const url = resolveMediaUrl(media)
        return (
          <li key={note.id} className="studio-timeline__item">
            <Link href={`/studio/notes/${note.id}`}>
              <time dateTime={note.capturedAt ?? note.createdAt}>
                {new Date(note.capturedAt ?? note.createdAt).toLocaleDateString()}
              </time>
              <span>{note.mediaType}</span>
              {note.writtenNote ? <p>{note.writtenNote}</p> : null}
              {url && note.mediaType === 'photo' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="studio-timeline__thumb" />
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

import Link from 'next/link'

import type { Artwork, Episode, FieldNote, Media } from '@/payload-types'

import { resolveMediaUrl } from '@/lib/studio/media'

type FieldNoteCardProps = {
  note: FieldNote
}

export function FieldNoteCard({ note }: FieldNoteCardProps) {
  const media = note.mediaFile && typeof note.mediaFile === 'object' ? (note.mediaFile as Media) : null
  const url = resolveMediaUrl(media)
  const artwork =
    note.relatedArtwork && typeof note.relatedArtwork === 'object'
      ? (note.relatedArtwork as Artwork)
      : null
  const episode =
    note.relatedEpisode && typeof note.relatedEpisode === 'object'
      ? (note.relatedEpisode as Episode)
      : null

  return (
    <Link href={`/studio/notes/${note.id}`} className="studio-note-card">
      <div className="studio-note-card__thumb">
        {url && note.mediaType === 'photo' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" />
        ) : (
          <span className="studio-painting-card__placeholder">{note.mediaType.slice(0, 4)}</span>
        )}
      </div>
      <div>
        <h3>{note.mediaType}</h3>
        <p className="studio-note-card__meta">
          {new Date(note.capturedAt ?? note.createdAt).toLocaleString()} · {note.processingStatus}
        </p>
        {note.writtenNote ? <p>{note.writtenNote.slice(0, 80)}</p> : null}
        {artwork?.title || episode?.title ? (
          <p className="studio-note-card__meta">
            {artwork?.title ? `Painting: ${artwork.title}` : ''}
            {episode?.title ? `Episode: ${episode.title}` : ''}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

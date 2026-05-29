import { notFound } from 'next/navigation'

import { FieldNoteDetailEditor } from '@/components/studio/FieldNoteDetailEditor'
import { getStudioPayload } from '@/lib/studio/getStudioPayload'
import { getFieldNote } from '@/lib/studio/fieldNotes'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FieldNoteDetailPage({ params }: PageProps) {
  const { id } = await params
  const noteId = Number(id)
  if (!Number.isFinite(noteId)) notFound()

  const { payload, user } = await getStudioPayload()
  let note
  try {
    note = await getFieldNote(payload, user, noteId)
  } catch {
    notFound()
  }

  return (
    <section>
      <FieldNoteDetailEditor note={note} />
    </section>
  )
}

import { Suspense } from 'react'

import { FieldNoteCard } from '@/components/studio/FieldNoteCard'
import { FieldNoteFilters } from '@/components/studio/FieldNoteFilters'
import { getStudioPayload } from '@/lib/studio/getStudioPayload'
import { listFieldNotes, parseFieldNoteFilters } from '@/lib/studio/fieldNotes'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function StudioNotesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filters = parseFieldNoteFilters(params)
  const { payload, user } = await getStudioPayload()
  const { docs } = await listFieldNotes(payload, user, filters)

  return (
    <section>
      <header className="studio-page-header">
        <h2>All Media</h2>
      </header>
      <Suspense fallback={null}>
        <FieldNoteFilters />
      </Suspense>
      {docs.length === 0 ? (
        <p className="studio-muted">No field notes match these filters.</p>
      ) : (
        <ul className="studio-card-grid">
          {docs.map((note) => (
            <li key={note.id}>
              <FieldNoteCard note={note} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

import type { AdminViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { AdminViewShell } from './AdminViewShell'
import { NewSessionButton } from './artOfficial/NewSessionButton'

function SessionList({
  title,
  docs,
}: {
  title: string
  docs: Array<{
    sessionId?: string | null
    sessionType?: string | null
    updatedAt?: string | null
    dialogueRefinementFlag?: boolean | null
    weakPhases?: string[] | null
  }>
}) {
  if (!docs.length) return null
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>{title}</h2>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {docs.map((s) => (
          <li key={s.sessionId} style={{ marginBottom: 8 }}>
            <Link href={`/admin/art-official/${s.sessionId}`}>
              {s.sessionType} · {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : ''}
              {s.dialogueRefinementFlag ? ' · needs refinement' : ''}
            </Link>
            {s.weakPhases?.length ? (
              <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.65 }}>
                ({s.weakPhases.join(', ')})
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export async function ArtOfficialView(props: AdminViewServerProps) {
  const { initPageResult, payload } = props
  const { req } = initPageResult
  const user = req.user

  if (!user || !isArtistOrAdmin(user)) redirect('/admin')

  const [inProgress, needsRefinement, completed] = await Promise.all([
    payload.find({
      collection: 'sessions',
      where: { status: { equals: 'in-progress' } },
      sort: '-updatedAt',
      limit: 50,
      overrideAccess: false,
      user,
      req,
    }),
    payload.find({
      collection: 'sessions',
      where: { dialogueRefinementFlag: { equals: true } },
      sort: '-updatedAt',
      limit: 25,
      overrideAccess: false,
      user,
      req,
    }),
    payload.find({
      collection: 'sessions',
      where: { status: { equals: 'completed' } },
      sort: '-updatedAt',
      limit: 20,
      overrideAccess: false,
      user,
      req,
    }),
  ])

  return (
    <AdminViewShell {...props}>
      <Gutter>
        <h1>Art/Official</h1>
        <p style={{ marginBottom: 16, opacity: 0.75 }}>
          Conversational cataloguing for the artist archive.
        </p>
        <NewSessionButton />
        <SessionList title="In progress" docs={inProgress.docs} />
        <SessionList title="Needs refinement" docs={needsRefinement.docs} />
        <SessionList title="Recent completed" docs={completed.docs} />
      </Gutter>
    </AdminViewShell>
  )
}

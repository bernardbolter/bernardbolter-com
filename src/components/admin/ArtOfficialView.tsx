import type { AdminViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { AdminViewShell } from './AdminViewShell'
import { ArtOfficialInstructions } from './artOfficial/ArtOfficialInstructions'
import { NewSessionButton } from './artOfficial/NewSessionButton'
import { getStartRecommendation } from '@/lib/artOfficial/startRecommendation'

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

  const adminRoute = payload.config.routes.admin
  const practiceKnowledgeHref = `${adminRoute}/collections/practice-knowledge`
  const artistsHref = `${adminRoute}/collections/artists`
  const artistCreateHref = `${artistsHref}/create`

  const artists = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
    req,
  })
  const artistExists = artists.docs.length > 0

  const recommendation = await getStartRecommendation({ payload, req, user })

  const practiceKnowledgeCount = await payload.count({
    collection: 'practice-knowledge',
    overrideAccess: false,
    user,
    req,
  })

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
        {practiceKnowledgeCount.totalDocs === 0 ? (
          <p
            style={{
              padding: 12,
              marginBottom: 16,
              background: 'var(--theme-warning-100)',
              borderRadius: 4,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Practice Knowledge rows are missing. Onboarding commit cannot write until you run:{' '}
            <code>npx tsx src/scripts/seed-practice-knowledge.ts</code>
          </p>
        ) : null}
        <ArtOfficialInstructions
          recommendation={recommendation}
          practiceKnowledgeHref={practiceKnowledgeHref}
          artistsHref={artistsHref}
          artistCreateHref={artistCreateHref}
          artistExists={artistExists}
        />
        <NewSessionButton
          defaultSessionType={recommendation.sessionType}
          disabled={!artistExists}
          artistsHref={artistsHref}
          artistCreateHref={artistCreateHref}
        />
        <SessionList title="In progress" docs={inProgress.docs} />
        <SessionList title="Needs refinement" docs={needsRefinement.docs} />
        <SessionList title="Recent completed" docs={completed.docs} />
      </Gutter>
    </AdminViewShell>
  )
}

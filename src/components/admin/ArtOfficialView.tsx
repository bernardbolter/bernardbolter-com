import type { AdminViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { AdminViewShell } from './AdminViewShell'
import { ArtOfficialHome } from './artOfficial/ArtOfficialHome'
import { getStartRecommendation } from '@/lib/artOfficial/startRecommendation'

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
          Conversational cataloguing for the artist archive.{' '}
          <Link href="/admin/art-official/audit">Session coverage audit →</Link>
        </p>
        <ArtOfficialHome
          recommendation={recommendation}
          practiceKnowledgeHref={practiceKnowledgeHref}
          artistsHref={artistsHref}
          artistCreateHref={artistCreateHref}
          artistExists={artistExists}
          practiceKnowledgeEmpty={practiceKnowledgeCount.totalDocs === 0}
          inProgress={inProgress.docs}
          needsRefinement={needsRefinement.docs}
          completed={completed.docs}
        />
      </Gutter>
    </AdminViewShell>
  )
}

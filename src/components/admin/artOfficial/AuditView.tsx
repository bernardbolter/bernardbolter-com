import type { AdminViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { AdminViewShell } from '../AdminViewShell'

import { AuditCoveragePanel } from './AuditCoveragePanel'

export async function AuditView(props: AdminViewServerProps) {
  const { initPageResult, payload, searchParams } = props
  const { req } = initPageResult
  const user = req.user

  if (!user || !isArtistOrAdmin(user)) redirect('/admin')

  const initialSessionId =
    typeof searchParams?.sessionId === 'string' ? searchParams.sessionId : null

  const completed = await payload.find({
    collection: 'sessions',
    where: { status: { equals: 'completed' } },
    sort: '-updatedAt',
    limit: 100,
    depth: 0,
    overrideAccess: false,
    user,
    req,
  })

  const sessions = completed.docs.map((s) => ({
    sessionId: s.sessionId ?? String(s.id),
    sessionType: s.sessionType,
    status: s.status,
    artworkRecord:
      typeof s.artworkRecord === 'object' && s.artworkRecord !== null
        ? s.artworkRecord.id
        : s.artworkRecord,
    updatedAt: s.updatedAt,
  }))

  return (
    <AdminViewShell {...props}>
      <Gutter>
        <p style={{ marginBottom: 16 }}>
          <Link href="/admin/art-official">← Art/Official</Link>
        </p>
        <h1 style={{ marginBottom: 8 }}>Session coverage audit</h1>
        <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 24, lineHeight: 1.5 }}>
          Read-only field coverage report for completed cataloguing sessions. Compares the
          session timeline against the committed artwork draft and flags gaps with remediation
          hints.
        </p>
        <Suspense fallback={<p className="art-official-audit__status">Loading…</p>}>
          <AuditCoveragePanel
            sessions={sessions}
            initialSessionId={initialSessionId ?? sessions[0]?.sessionId}
          />
        </Suspense>
      </Gutter>
    </AdminViewShell>
  )
}

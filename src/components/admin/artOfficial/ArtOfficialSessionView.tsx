import type { AdminViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import type { StoredMessage } from '@/lib/artOfficial/chatMessages'
import {
  finalizeOnboardingTimeline,
  reconcileFieldUpdateTimeline,
  type TimelineEntry,
} from '@/lib/artOfficial/sessionTimeline'
import { AdminViewShell } from '../AdminViewShell'

import { ChatPane } from './ChatPane'

function resolveSessionId(params?: AdminViewServerProps['params']): string | null {
  const segments = params?.segments
  if (Array.isArray(segments) && segments.length >= 2 && segments[0] === 'art-official') {
    return segments[1] ?? null
  }
  return null
}

export async function ArtOfficialSessionView(props: AdminViewServerProps) {
  const sessionId = resolveSessionId(props.params)
  if (!sessionId) notFound()

  const { initPageResult, payload } = props
  const { req } = initPageResult
  const user = req.user

  if (!user || !isArtistOrAdmin(user)) redirect('/admin')

  const result = await payload.find({
    collection: 'sessions',
    where: { sessionId: { equals: sessionId } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
    user,
    req,
  })

  let session = result.docs[0]
  if (!session) notFound()

  const storedMessages = (
    Array.isArray(session.messages) ? session.messages : []
  ) as StoredMessage[]
  const existingTimeline = (
    Array.isArray(session.fieldUpdateTimeline) ? session.fieldUpdateTimeline : []
  ) as TimelineEntry[]

  let { timeline, repaired } = reconcileFieldUpdateTimeline(
    storedMessages,
    existingTimeline,
  )

  if (session.sessionType === 'onboarding') {
    const { timeline: pkOnly, dropped } = finalizeOnboardingTimeline(timeline)
    if (dropped > 0) {
      timeline = pkOnly
      repaired = true
    }
  }

  if (repaired) {
    await payload.update({
      collection: 'sessions',
      id: session.id,
      data: { fieldUpdateTimeline: timeline },
      overrideAccess: false,
      user,
      req,
      context: { skipAgent: true },
    })
    session = { ...session, fieldUpdateTimeline: timeline }
  }

  return (
    <AdminViewShell {...props}>
      <Gutter>
        <p style={{ marginBottom: 16 }}>
          <Link href="/admin/art-official">← Art/Official</Link>
        </p>
        <h1 style={{ marginBottom: 8 }}>
          {session.sessionType} · {session.status}
        </h1>
        <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 24 }}>
          Session {session.sessionId}
        </p>
        <ChatPane initialSession={session} />
      </Gutter>
    </AdminViewShell>
  )
}

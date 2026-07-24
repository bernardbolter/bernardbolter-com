import Link from 'next/link'

import { buildSessionGloss, type SessionGlossInput } from '@/lib/corpus/sessionGloss'
import { sessionTier5ApiPath } from '@/lib/corpus/buildTier5SessionsResponse'
import type { Session } from '@/payload-types'

type Props = {
  session: Session | null | undefined
  passNumber?: number | null
  showJsonLink?: boolean
  className?: string
}

function glossInputFromSession(
  session: Session,
  passNumber?: number | null,
): SessionGlossInput {
  return {
    sessionType: session.sessionType,
    fieldsCoveredThisSession: session.fieldsCoveredThisSession,
    revisitOf: session.revisitOf,
    passNumber: passNumber ?? null,
    linchpinFlag: session.linchpinFlag,
    sessionStruggleFlag: session.sessionStruggleFlag,
    priorFieldConflicts: session.priorFieldConflicts,
  }
}

/**
 * Shared session summary line — identical on /sessions, bio entries, and throughlines.
 */
export default function SessionGlossLine({
  session,
  passNumber,
  showJsonLink = false,
  className,
}: Props) {
  if (!session?.sessionId || session.status !== 'completed') return null

  const gloss = buildSessionGloss(glossInputFromSession(session, passNumber))
  const href = `/sessions/${session.sessionId}`
  const jsonHref = sessionTier5ApiPath(session.sessionId)

  return (
    <div className={className ?? 'session-gloss-line'}>
      <Link href={href} className="bio__inline-link">
        {session.linchpinFlag?.isLinchpin ? '◆ ' : ''}
        Session {session.sessionId.slice(0, 8)}…
      </Link>
      <p className="bio__masonry-caption">{gloss}</p>
      {showJsonLink ? (
        <p className="corpus-page__links">
          <a href={jsonHref} className="still-being-written__session-link">
            Full session data (JSON)
          </a>
        </p>
      ) : null}
    </div>
  )
}

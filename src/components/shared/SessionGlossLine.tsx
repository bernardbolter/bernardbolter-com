import Link from 'next/link'

import { buildSessionGloss, type SessionGlossInput } from '@/lib/corpus/sessionGloss'
import { sessionTier5ApiPath } from '@/lib/corpus/buildTier5SessionsResponse'
import { formatSessionPageTitle } from '@/lib/corpus/sessionPageTitle'
import type { Session } from '@/payload-types'

type Props = {
  session: Session | null | undefined
  passNumber?: number | null
  /** Primary artwork slug — preferred target for the Tier 5 JSON link. */
  artworkSlug?: string | null
  /** Primary artwork title for the public session anchor (not sessionId slice). */
  artworkTitle?: string | null
  showJsonLink?: boolean
  className?: string
}

function glossInputFromSession(
  session: Session,
  passNumber?: number | null,
): SessionGlossInput {
  const timeline = Array.isArray(session.fieldUpdateTimeline)
    ? (session.fieldUpdateTimeline as Array<{ field?: string | null }>)
    : null
  return {
    sessionType: session.sessionType,
    fieldsCoveredThisSession: session.fieldsCoveredThisSession,
    fieldUpdateTimeline: timeline,
    revisitOf: session.revisitOf,
    passNumber: passNumber ?? null,
    linchpinFlag: session.linchpinFlag,
    sessionStruggleFlag: session.sessionStruggleFlag,
    priorFieldConflicts: session.priorFieldConflicts,
  }
}

/**
 * Shared session summary line — identical on /sessions, bio entries, and throughlines.
 * When `artworkSlug` is set, the JSON link points at `/api/corpus/{slug}/sessions`.
 */
export default function SessionGlossLine({
  session,
  passNumber,
  artworkSlug,
  artworkTitle,
  showJsonLink = false,
  className,
}: Props) {
  if (!session?.sessionId || session.status !== 'completed') return null

  const gloss = buildSessionGloss(glossInputFromSession(session, passNumber))
  const href = `/sessions/${session.sessionId}`
  const slug = artworkSlug?.trim()
  const jsonHref = slug
    ? `/api/corpus/${encodeURIComponent(slug)}/sessions`
    : sessionTier5ApiPath(session.sessionId)
  const anchor = formatSessionPageTitle({
    artworkTitle,
    completedAt: session.completedAt,
  })

  return (
    <div className={className ?? 'session-gloss-line'}>
      <Link href={href} className="bio__inline-link">
        {session.linchpinFlag?.isLinchpin ? '◆ ' : ''}
        {anchor}
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

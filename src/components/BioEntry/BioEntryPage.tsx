import Link from 'next/link'

import DiscoveryExcerpt from '@/components/shared/DiscoveryExcerpt'
import SessionGlossLine from '@/components/shared/SessionGlossLine'
import SessionSiblingLinks, {
  type SiblingLink,
} from '@/components/shared/SessionSiblingLinks'
import StatementRelatedWorks from '@/components/statement/StatementRelatedWorks'
import type { StatementRelatedWork } from '@/helpers/statementRelatedWorks'
import type { Session } from '@/payload-types'

type Props = {
  eventDate: string | null
  text: string
  discoveryExcerpt: unknown
  artworks: StatementRelatedWork[]
  sourceSession: Session | null
  siblings: SiblingLink[]
}

export default function BioEntryPage({
  eventDate,
  text,
  discoveryExcerpt,
  artworks,
  sourceSession,
  siblings,
}: Props) {
  return (
    <article className="bio-entry-page">
      <p className="bio__masonry-caption">
        <Link href="/bio" className="bio__inline-link">
          ← Bio
        </Link>
      </p>
      {eventDate ? <p className="bio-entry-page__date">{eventDate}</p> : null}
      <h1 className="bio-entry-page__title">{text}</h1>

      <DiscoveryExcerpt data={discoveryExcerpt} />

      <StatementRelatedWorks items={artworks} />

      {sourceSession ? (
        <section className="bio-entry-page__session" aria-label="Source session">
          <h2 className="still-being-written__heading">Source session</h2>
          <SessionGlossLine session={sourceSession} showJsonLink />
        </section>
      ) : null}

      <SessionSiblingLinks siblings={siblings} />
    </article>
  )
}

import Link from 'next/link'

import DiscoveryExcerpt from '@/components/shared/DiscoveryExcerpt'
import SessionGlossLine from '@/components/shared/SessionGlossLine'
import SessionSiblingLinks, {
  type SiblingLink,
} from '@/components/shared/SessionSiblingLinks'
import StatementRelatedWorks from '@/components/statement/StatementRelatedWorks'
import type { StatementRelatedWork } from '@/helpers/statementRelatedWorks'
import type { Session } from '@/payload-types'

export type ReinforcementRow = {
  key: string
  session: Session
  note: string | null
  isOrigin: boolean
}

type Props = {
  dateRecognized: string | null
  text: string
  discoveryExcerpt: unknown
  artworks: StatementRelatedWork[]
  reinforcementRows: ReinforcementRow[]
  siblings: SiblingLink[]
}

export default function ThroughlinePage({
  dateRecognized,
  text,
  discoveryExcerpt,
  artworks,
  reinforcementRows,
  siblings,
}: Props) {
  const confirmedCount = reinforcementRows.length

  return (
    <article className="throughline-page">
      <p className="bio__masonry-caption">
        <Link href="/statement" className="bio__inline-link">
          ← Statement
        </Link>
      </p>
      {dateRecognized ? (
        <p className="throughline-page__date">Recognized {dateRecognized}</p>
      ) : null}
      <h1 className="throughline-page__title">{text}</h1>

      <DiscoveryExcerpt data={discoveryExcerpt} />

      <StatementRelatedWorks items={artworks} />

      {confirmedCount > 0 ? (
        <section className="throughline-page__reinforcements" aria-label="Reinforcement history">
          <h2 className="still-being-written__heading">
            Confirmed across {confirmedCount} session{confirmedCount === 1 ? '' : 's'}
          </h2>
          <ol className="throughline-page__reinforcement-list">
            {reinforcementRows.map((row) => (
              <li key={row.key} className="throughline-page__reinforcement-row">
                {row.isOrigin ? (
                  <p className="bio__masonry-caption">Originating session</p>
                ) : null}
                <SessionGlossLine session={row.session} showJsonLink />
                {row.note ? (
                  <p className="bio__masonry-caption throughline-page__note">{row.note}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <SessionSiblingLinks siblings={siblings} />
    </article>
  )
}

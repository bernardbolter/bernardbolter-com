import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import StillBeingWritten from '@/components/shared/StillBeingWritten'
import type { StatementPhoto } from '@/helpers/statementPhotos'
import type { StatementRelatedWork } from '@/helpers/statementRelatedWorks'
import type { AccumulatingEntry, HistoricalDocumentLink } from '@/lib/artist/accumulatingEntries'

import StatementClosingBody from './StatementClosingBody'
import StatementClosing from './StatementClosing'
import StatementMiddleBody from './StatementMiddleBody'
import StatementOpening from './StatementOpening'
import StatementPullQuote from './StatementPullQuote'
import StatementSceneImages from './StatementSceneImages'
import StatementRelatedWorks from './StatementRelatedWorks'
import './statement-page.css'

interface StatementProps {
  statementOpening: unknown
  statementPullQuote?: string | null
  statementMiddleBody: unknown
  statementClosingBody: unknown
  statementClosingLine?: string | null
  sceneImagesFirst: StatementPhoto[]
  sceneImagesSecond: StatementPhoto[]
  relatedWorks: StatementRelatedWork[]
  throughlines?: AccumulatingEntry[]
  historicalStatements?: HistoricalDocumentLink[]
}

export default function Statement({
  statementOpening,
  statementPullQuote,
  statementMiddleBody,
  statementClosingBody,
  statementClosingLine,
  sceneImagesFirst,
  sceneImagesSecond,
  relatedWorks,
  throughlines = [],
  historicalStatements = [],
}: StatementProps) {
  const hasOpening = Boolean(statementOpening)
  const hasClosingBody = Boolean(statementClosingBody)

  return (
    <DocumentScrollShell
      title="STATEMENT"
      titleLarge
      closeHref="/"
      scrollClassName="bio-container statement-page"
      closeClassName="bio__close-container"
      contentClassName="bio__content-container"
    >
      {hasOpening ?
        <StatementOpening content={statementOpening} />
      : <div className="bio__main-content">
          <p>Statement content coming soon.</p>
        </div>
      }

      <StatementPullQuote line={statementPullQuote} />
      <StatementSceneImages photos={sceneImagesFirst} />
      <StatementMiddleBody content={statementMiddleBody} />
      <StatementSceneImages photos={sceneImagesSecond} />
      {hasClosingBody ? <StatementClosingBody content={statementClosingBody} /> : null}
      <StatementRelatedWorks items={relatedWorks} />
      <StillBeingWritten
        entries={throughlines}
        historicalLinks={historicalStatements}
        historicalHeading="Earlier statements"
      />
      <StatementClosing line={statementClosingLine?.trim() ?? ''} />
    </DocumentScrollShell>
  )
}

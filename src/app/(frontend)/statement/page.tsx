import type { Metadata } from 'next'

import Info from '@/components/info/Info'
import Statement from '@/components/statement/Statement'
import {
  normalizeStatementSceneImagesFirst,
  normalizeStatementSceneImagesSecond,
} from '@/helpers/statementPhotos'
import { normalizeStatementRelatedWorks } from '@/helpers/statementRelatedWorks'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import {
  getStatementAboutEventFromArtist,
  getStatementPageArtist,
} from '@/lib/payload/statementPage'
import { generateStatementJsonLd } from '@/utilities/generateStatementJsonLd'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Statement',
  description: 'Artist statement by Bernard Bolter.',
  alternates: { canonical: '/statement' },
}

export default async function StatementPage() {
  const artist = await getStatementPageArtist()
  const aboutEvent = artist ? await getStatementAboutEventFromArtist(artist) : null
  const jsonLd =
    artist ?
      generateStatementJsonLd(artist, {
        baseUrl: getSiteBaseUrl(),
        aboutEvent,
      })
    : null

  return (
    <div className="bio-page__container">
      {jsonLd ?
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      : null}
      <Info />
      {artist ?
        <Statement
          statementOpening={artist.statementOpening}
          statementPullQuote={artist.statementPullQuote}
          statementMiddleBody={artist.statementMiddleBody}
          statementClosingBody={artist.statementClosingBody}
          statementClosingLine={artist.statementClosingLine}
          sceneImagesFirst={normalizeStatementSceneImagesFirst(artist)}
          sceneImagesSecond={normalizeStatementSceneImagesSecond(artist)}
          relatedWorks={normalizeStatementRelatedWorks(artist.statementRelatedWorks)}
        />
      : <Statement
          statementOpening={null}
          statementPullQuote={null}
          statementMiddleBody={null}
          statementClosingBody={null}
          statementClosingLine={null}
          sceneImagesFirst={[]}
          sceneImagesSecond={[]}
          relatedWorks={[]}
        />
      }
    </div>
  )
}

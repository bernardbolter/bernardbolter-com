import type { Metadata } from 'next'

import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import { loadArtOfficialProtocolText } from '@/lib/artOfficial/contract/readContractArtifact'
import { ART_OFFICIAL_PROTOCOL_VERSION } from '@/lib/artOfficial/contract/versions'
import { buildPageMetadata } from '@/lib/seo/pageMetadata'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: 'Art/Official protocol',
  description: `Artwork cataloguing session protocol v${ART_OFFICIAL_PROTOCOL_VERSION} — beats, conduct, confirmation.`,
  path: '/art-official/protocol',
})

export default async function ArtOfficialProtocolPage() {
  const text = await loadArtOfficialProtocolText()

  return (
    <div className="bio-page__container">
      <DocumentScrollShell
        title="PROTOCOL"
        closeHref="/"
        scrollClassName="bio-container"
        closeClassName="bio__close-container"
      >
        <article className="bio__content-container art-official-doc">
          <pre className="art-official-doc__protocol">{text}</pre>
        </article>
      </DocumentScrollShell>
    </div>
  )
}

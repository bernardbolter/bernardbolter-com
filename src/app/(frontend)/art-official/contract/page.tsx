import type { Metadata } from 'next'

import ContractPageView from '@/components/artOfficial/ContractPageView'
import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import { loadArtOfficialContractForPage } from '@/lib/artOfficial/contract/readContractArtifact'
import { buildPageMetadata } from '@/lib/seo/pageMetadata'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: 'Art/Official contract',
  description:
    'Generated import contract for Bernard Bolter’s Art/Official archive — accepted fields, rejections, endpoints, worked example.',
  path: '/art-official/contract',
})

export default async function ArtOfficialContractPage() {
  const contract = await loadArtOfficialContractForPage()

  return (
    <div className="bio-page__container">
      <DocumentScrollShell
        title="CONTRACT"
        closeHref="/"
        scrollClassName="bio-container"
        closeClassName="bio__close-container"
      >
        <ContractPageView contract={contract} />
      </DocumentScrollShell>
    </div>
  )
}

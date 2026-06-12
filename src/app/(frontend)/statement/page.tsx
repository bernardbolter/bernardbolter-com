import type { Metadata } from 'next'

import Info from '@/components/info/Info'
import Statement from '@/components/statement/Statement'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { getCvPageArtist } from '@/lib/payload/cvPage'
import { readStatementFooterImages } from '@/lib/payload/statementFooterImages'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Statement',
  description: 'Artist statement by Bernard Bolter.',
  alternates: { canonical: '/statement' },
}

export default async function StatementPage() {
  const artist = await getCvPageArtist()
  const statementText = lexicalToPlain(artist?.statementFull)
  const paragraphs = statementText
    .split('\n\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
  const footerImages = readStatementFooterImages(artist)

  return (
    <div className="bio-page__container">
      <Info />
      <Statement paragraphs={paragraphs} footerImages={footerImages} />
    </div>
  )
}

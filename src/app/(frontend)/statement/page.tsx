import type { Metadata } from 'next'

import Info from '@/components/info/Info'
import Statement from '@/components/statement/Statement'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { getPerson } from '@/lib/payload/person'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Statement',
  description: 'Artist statement by Bernard Bolter.',
  alternates: { canonical: '/statement' },
}

export default async function StatementPage() {
  const person = await getPerson()
  const statementText = lexicalToPlain(person?.statementFull)
  const paragraphs = statementText
    .split('\n\n')
    .map((entry) => entry.trim())
    .filter(Boolean)

  return (
    <div className="bio-page__container">
      <Info />
      <Statement paragraphs={paragraphs} />
    </div>
  )
}

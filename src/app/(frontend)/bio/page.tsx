import type { Metadata } from 'next'
import Link from 'next/link'

import { BackArrowSvg, CloseCircleSvg } from '@/components/icons'
import HeaderTitle from '@/components/info/HeaderTitle'
import { getPerson } from '@/lib/payload/person'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Bio',
  description: 'Biography of Bernard Bolter.',
  alternates: { canonical: '/bio' },
}

export default async function BioPage() {
  const person = await getPerson()
  const bioText = lexicalToPlain(person?.bioFull)
  const bioParagraphs = bioText
    .split('\n\n')
    .map((entry) => entry.trim())
    .filter(Boolean)

  return (
    <main className="relative min-h-screen bg-surface-page px-[5%] pb-space-6 pt-[3.5rem] m:px-[8%] l:mx-auto l:max-w-grid l:px-space-6">
      <HeaderTitle title="BIO" />

      <Link
        href="/"
        className="fixed left-space-2 top-space-2 z-ui-top flex h-[2.125rem] items-center gap-space-2 rounded bg-surface-nav px-space-2 no-underline"
      >
        <span className="h-6 w-6 fill-dark">
          <CloseCircleSvg />
        </span>
        <span className="font-heading text-sm text-dark">close</span>
      </Link>

      <section className="relative z-overlay mx-auto max-w-[44rem] pt-space-4">
        <h2 className="mb-space-4 font-heading text-lg text-dark">
          {person?.bioShort ?? 'Biography'}
        </h2>
        {bioParagraphs.length > 0 ? (
          bioParagraphs.map((paragraph, index) => (
            <p key={index} className="mb-space-4 font-body text-base leading-relaxed text-dark">
              {paragraph}
            </p>
          ))
        ) : (
          <p className="font-body text-base text-secondary">Biography content coming soon.</p>
        )}
      </section>

      <Link
        href="/"
        className="fixed bottom-space-2 left-space-2 z-ui-top flex items-center gap-space-2 rounded bg-surface-nav px-space-2 py-space-1 no-underline m:hidden"
      >
        <span className="h-4 w-4 fill-dark">
          <BackArrowSvg />
        </span>
        <span className="font-heading text-xs text-dark">all artwork</span>
      </Link>
    </main>
  )
}

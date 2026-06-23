import type { Metadata } from 'next'
import Link from 'next/link'

import { CloseCircleSvg } from '@/components/icons'
import '@/components/legal/datenschutz-prose.css'
import LexicalProse from '@/lib/contact/LexicalProse'
import {
  buildDatenschutzLexicalDe,
  buildDatenschutzLexicalEn,
} from '@/content/datenschutzPolicy'
import { applyImpressumToDatenschutz } from '@/lib/legal/applyImpressumToDatenschutz'
import { getDatenschutzPageData } from '@/lib/payload/datenschutzPage'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Datenschutz',
  description: 'Privacy policy / Datenschutzerklärung for bernardbolter.com (English and German).',
  alternates: { canonical: '/datenschutz' },
  robots: { index: true, follow: true },
}

export default async function DatenschutzPage() {
  const { de, en, impressum } = await getDatenschutzPageData()
  const deContent = applyImpressumToDatenschutz(de ?? buildDatenschutzLexicalDe(), impressum, 'de')
  const enContent = applyImpressumToDatenschutz(en ?? buildDatenschutzLexicalEn(), impressum, 'en')

  return (
    <main className="relative min-h-screen w-full overflow-y-auto bg-surface-page text-dark scrollbar-none">
      <Link
        href="/contact"
        className="fixed right-[0.3125rem] top-[0.3125rem] z-ui-top flex h-[1.875rem] w-[1.875rem] items-center justify-center opacity-80 transition-opacity hover:opacity-100"
        aria-label="Close privacy policy"
      >
        <span className="h-full w-full fill-dark stroke-dark">
          <CloseCircleSvg />
        </span>
      </Link>

      <article className="relative z-overlay mx-auto w-full max-w-4xl px-[10%] pb-space-6 pt-[5.5rem]">
        <section
          className="datenschutz-lang-section"
          aria-labelledby="datenschutz-de-heading"
        >
          <h2 id="datenschutz-de-heading" className="datenschutz-lang" lang="de">
            Datenschutzerklärung
          </h2>
          <LexicalProse content={deContent} className="datenschutz-prose" />
        </section>

        <section
          className="datenschutz-lang-section"
          aria-labelledby="datenschutz-en-heading"
        >
          <h2 id="datenschutz-en-heading" className="datenschutz-lang" lang="en">
            Privacy policy
          </h2>
          <LexicalProse content={enContent} className="datenschutz-prose" />
        </section>
      </article>
    </main>
  )
}

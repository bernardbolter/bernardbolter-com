import type { Metadata } from 'next'
import Link from 'next/link'

import { CloseCircleSvg } from '@/components/icons'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { getPerson } from '@/lib/payload/person'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Datenschutz',
  description: 'Privacy policy for bernardbolter.com.',
  alternates: { canonical: '/datenschutz' },
  robots: { index: true, follow: true },
}

export default async function DatenschutzPage() {
  const person = await getPerson()
  const policyText = lexicalToPlain(person?.datenschutzFull)
  const policyParagraphs = policyText
    .split('\n\n')
    .map((entry) => entry.trim())
    .filter(Boolean)

  return (
    <main className="relative min-h-screen w-full overflow-y-auto bg-surface-page text-dark scrollbar-none">
      <Link
        href="/contact"
        className="fixed left-[0.3125rem] top-[0.3125rem] z-ui-top flex h-[1.875rem] w-[1.875rem] items-center justify-center opacity-80 transition-opacity hover:opacity-100"
        aria-label="Close privacy policy"
      >
        <span className="h-full w-full fill-dark stroke-dark">
          <CloseCircleSvg />
        </span>
      </Link>

      <article className="relative z-overlay w-full px-[1%] pb-space-6 pt-[3.125rem]">
        {policyParagraphs.length > 0 ? (
          policyParagraphs.map((paragraph, index) => (
            <p
              key={index}
              className="mb-[0.625rem] box-border w-full px-[0.625rem] font-body text-sm leading-snug text-[#333]"
            >
              {paragraph}
            </p>
          ))
        ) : (
          <p className="px-[0.625rem] font-body text-sm leading-snug text-secondary">
            Privacy policy content is being prepared. For inquiries, use the{' '}
            <Link href="/contact" className="underline">
              contact page
            </Link>
            .
          </p>
        )}
      </article>
    </main>
  )
}

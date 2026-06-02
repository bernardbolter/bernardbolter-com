'use client'

import Link from 'next/link'
import { useState } from 'react'

import { BackArrowSvg, CloseCircleSvg } from '@/components/icons'
import HeaderTitle from '@/components/info/HeaderTitle'
import type { CvSectionBlock } from '@/lib/cv/buildCvSections'

interface CvPageContentProps {
  sections: CvSectionBlock[]
}

function splitCvLine(text: string): { year: string; body: string } {
  const match = text.match(/^(\d{4}(?:–\d{4}|–ongoing)?)\s+(.+)$/u)
  if (!match) return { year: '', body: text }
  return { year: match[1], body: match[2] }
}

export default function CvPageContent({ sections }: CvPageContentProps) {
  const [printHovered, setPrintHovered] = useState(false)

  return (
    <main className="cv-page relative min-h-screen w-full overflow-y-auto bg-surface-page text-dark scrollbar-none">
      <HeaderTitle title="CV" large />

      <Link
        href="/"
        className="cv-page__chrome fixed right-0 top-[3.0625rem] z-ui-top flex w-[2.1875rem] flex-col items-center justify-center opacity-60 no-underline transition-opacity hover:opacity-90 s:top-[4.0625rem] s:h-[2.625rem] s:w-[2.625rem] m:top-[5.5rem] l:top-[6.5625rem]"
      >
        <span className="h-full w-full fill-dark">
          <CloseCircleSvg />
        </span>
        <span className="font-heading text-[0.625rem] font-light tracking-wide text-dark">close</span>
      </Link>

      <button
        type="button"
        onClick={() => window.print()}
        onMouseEnter={() => setPrintHovered(true)}
        onMouseLeave={() => setPrintHovered(false)}
        className="cv-page__chrome fixed right-[0.625rem] top-[5.75rem] z-ui-top cursor-pointer rounded px-space-2 py-space-1 font-heading text-xs transition-colors s:top-[7.1875rem] m:top-[8.75rem] l:top-[9.75rem]"
        style={{
          background: printHovered ? '#999' : '#ededed',
          color: printHovered ? '#ededed' : '#222',
        }}
        aria-label="Print Curriculum Vitae (A4 Format)"
      >
        Print CV
      </button>

      <div className="cv-page__content relative z-overlay mx-[5%] mb-space-6 mt-[8.4375rem] w-[90%] s:mx-[8%] s:mt-[7.5rem] s:w-[84%] m:mx-auto m:mb-[8.75rem] m:ml-[9.375rem] m:mt-[8.75rem] m:max-w-[50rem] m:w-[78%] l:mx-[2%] l:ml-[20%] l:mt-[8.75rem]">
        {sections.length === 0 ? (
          <p className="font-body text-base text-secondary">No published CV entries yet.</p>
        ) : (
          sections.map((section) => (
            <section key={section.slug} className="mb-space-5">
              <h2 className="mb-1 font-heading text-lg font-black uppercase text-dark s:text-[1.375rem]">
                {section.heading}
              </h2>
              <ul className="list-none p-0">
                {section.items.map((item) => {
                  const { year, body } = splitCvLine(item.text)
                  return (
                    <li
                      key={item.id}
                      className="cv-page__entry flex flex-wrap items-center pb-1 font-body text-dark"
                    >
                      {year ? (
                        <span className="pr-1 font-mono text-xs font-medium leading-none s:text-sm m:text-base">
                          {year}
                        </span>
                      ) : null}
                      <span className="text-xs font-light leading-snug s:text-sm m:text-base">{body || item.text}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <Link
        href="/"
        className="cv-page__chrome fixed bottom-space-2 left-space-2 z-ui-top flex items-center gap-space-2 rounded bg-surface-nav px-space-2 py-space-1 no-underline m:hidden"
      >
        <span className="h-4 w-4 fill-dark">
          <BackArrowSvg />
        </span>
        <span className="font-heading text-xs text-dark">all artwork</span>
      </Link>
    </main>
  )
}

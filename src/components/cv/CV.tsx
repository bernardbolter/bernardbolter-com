'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CloseCircleSvg } from '@/components/icons'
import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import type { CvSectionBlock } from '@/lib/cv/buildCvSections'

import CvRow, { CvSection } from '@/components/cv/CvRow'

import './cv-page.css'

interface CvProps {
  sections: CvSectionBlock[]
  printName?: string | null
  printBirthLine?: string | null
  printLivesLine?: string | null
}

function CvPrintButton() {
  const [buttonHovered, setButtonHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-cv-button"
      aria-label="Print Curriculum Vitae (A4 Format)"
      onMouseEnter={() => setButtonHovered(true)}
      onMouseLeave={() => setButtonHovered(false)}
      style={{
        background: buttonHovered ? '#999' : '#ededed',
        color: buttonHovered ? '#ededed' : '#222',
      }}
    >
      Print CV
    </button>
  )
}

export default function CV({ sections, printName, printBirthLine, printLivesLine }: CvProps) {
  return (
    <div className="cv-page">
      <DocumentScrollShell
        title="CV"
        titleLarge
        closeHref="/"
        scrollClassName="cv-page__scroll"
        contentClassName="cv-content"
        closeClassName="cv-close-button"
        closeSlot={
          <>
            <Link href="/" className="cv-close-button">
              <CloseCircleSvg />
              <p>close</p>
            </Link>
            <CvPrintButton />
          </>
        }
      >
        {(printName || printBirthLine || printLivesLine) && (
          <div className="cv-print-header">
            {printName ? <div className="cv-print-name">{printName}</div> : null}
            {printBirthLine ? <div className="cv-print-meta">{printBirthLine}</div> : null}
            {printLivesLine ? <div className="cv-print-meta">{printLivesLine}</div> : null}
          </div>
        )}

        {sections.length === 0 ?
          <p className="cv__empty">No published CV entries yet.</p>
        : sections.map((section) => (
            <CvSection key={section.slug} heading={section.heading}>
              {section.items.map((item) => (
                <CvRow key={item.id} row={item.row} />
              ))}
            </CvSection>
          ))
        }
      </DocumentScrollShell>
    </div>
  )
}

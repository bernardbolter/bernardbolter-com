'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { CloseCircleSvg } from '@/components/icons'
import HeaderTitle from '@/components/info/HeaderTitle'
import {
  cvSectionDisplayHeading,
  type CvEntryParts,
  type CvSectionBlock,
} from '@/lib/cv/buildCvSections'

interface CvProps {
  sections: CvSectionBlock[]
}

function LinkedTitle({
  href,
  children,
  as: Tag,
}: {
  href: string
  children: ReactNode
  as: 'h3' | 'h4'
}) {
  return (
    <Tag>
      <Link href={href} className="cv__entry-link">
        {children}
      </Link>
    </Tag>
  )
}

function CvEntry({
  parts,
  hasPage,
  slug,
}: {
  parts: CvEntryParts
  hasPage?: boolean
  slug?: string | null
}) {
  const linkHref = hasPage && slug ? `/events/${slug}` : null
  const linkTitle = (text: string) =>
    linkHref ? <LinkedTitle href={linkHref} as="h4">{text}</LinkedTitle> : <h4>{text}</h4>

  if (parts.variant === 'plain') {
    const primary =
      linkHref ?
        <LinkedTitle href={linkHref} as="h3">{parts.primary}</LinkedTitle>
      : <h3>{parts.primary}</h3>
    return (
      <div className="cv__entry">
        {primary}
      </div>
    )
  }

  if (parts.variant === 'publication') {
    const primary =
      linkHref ?
        <LinkedTitle href={linkHref} as="h3">{parts.primary}</LinkedTitle>
      : <h3>{parts.primary}</h3>
    return (
      <div className="cv__entry">
        <h2>{parts.year}</h2>
        {primary}
        {parts.secondary ? <h4>{parts.secondary}</h4> : null}
      </div>
    )
  }

  return (
    <div className="cv__entry">
      <h2>{parts.year}</h2>
      {parts.primary ? <h3>{parts.primary}</h3> : null}
      {parts.secondary ? linkTitle(parts.secondary) : null}
      {parts.tertiary ? <h5>{parts.tertiary}</h5> : null}
    </div>
  )
}

export default function CV({ sections }: CvProps) {
  const [buttonHovered, setButtonHovered] = useState(false)

  return (
    <div className="cv__container">
      <HeaderTitle title="CV" large />

      <Link href="/" className="cv__close-container">
        <CloseCircleSvg />
        <p>close</p>
      </Link>

      <button
        type="button"
        onClick={() => window.print()}
        className="cv__print-button"
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

      <div className="cv__content">
        {sections.length === 0 ? (
          <p className="cv__empty">No published CV entries yet.</p>
        ) : (
          sections.map((section) => (
            <section key={section.slug}>
              <h1 className="cv__header">{cvSectionDisplayHeading(section.slug, section.heading)}</h1>
              {section.items.map((item) => (
                <CvEntry
                  key={item.id}
                  parts={item.parts}
                  hasPage={item.hasPage}
                  slug={item.slug}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  )
}

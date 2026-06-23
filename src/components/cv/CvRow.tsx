import Link from 'next/link'
import type { ReactNode } from 'react'

import type { CvRowModel } from '@/lib/cv/cvRowModel'

const AWARD_OUTCOME_LABEL: Record<
  NonNullable<Extract<CvRowModel, { kind: 'award' }>['outcome']>,
  string
> = {
  winner: 'winner',
  shortlisted: 'shortlisted',
  nominated: 'nominated',
  'honourable-mention': 'honourable mention',
}

function ArrowUpRightIcon() {
  return (
    <svg
      className="ti-arrow-up-right"
      viewBox="0 0 24 24"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <path
        d="M7 17L17 7M17 7H9M17 7V15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CvRowTitle({
  title,
  hasPage,
  slug,
}: {
  title: string
  hasPage?: boolean
  slug?: string | null
}) {
  if (hasPage && slug) {
    return (
      <>
        <Link href={`/events/${slug}`} className="cv-row__title cv-row__title--linked">
          {title}
        </Link>
        <ArrowUpRightIcon />
      </>
    )
  }

  return <span className="cv-row__title">{title}</span>
}

function joinVenueCity(venue: string, city: string): string {
  return [venue, city].filter(Boolean).join(', ')
}

function CvRowContent({ row }: { row: CvRowModel }) {
  switch (row.kind) {
    case 'education': {
      const place = joinVenueCity(row.institution, row.city)
      return (
        <>
          <CvRowTitle title={row.degreeSubject} hasPage={row.hasPage} slug={row.slug} />
          {place ?
            <>
              <span className="cv-row__separator"> — </span>
              <span className="cv-row__venue">{place}</span>
            </>
          : null}
        </>
      )
    }

    case 'venue-title': {
      const place = joinVenueCity(row.venue, row.city)
      return (
        <>
          <CvRowTitle title={row.title} hasPage={row.hasPage} slug={row.slug} />
          {place ?
            <>
              <span className="cv-row__separator"> — </span>
              <span className="cv-row__venue">{place}</span>
            </>
          : null}
        </>
      )
    }

    case 'publication':
      return (
        <>
          <span className="cv-row__quote">&lsquo;</span>
          <CvRowTitle title={row.articleTitle} hasPage={row.hasPage} slug={row.slug} />
          <span className="cv-row__quote">&rsquo;</span>
          {row.publicationName ?
            <>
              <span className="cv-row__separator"> in </span>
              <span className="cv-row__venue">{row.publicationName}</span>
            </>
          : null}
        </>
      )

    case 'bibliography':
      return (
        <>
          {row.author ?
            <>
              <span className="cv-row__venue">{row.author}</span>
              <span className="cv-row__separator">, </span>
            </>
          : null}
          <span className="cv-row__quote">&lsquo;</span>
          <CvRowTitle title={row.title} hasPage={row.hasPage} slug={row.slug} />
          <span className="cv-row__quote">&rsquo;</span>
          {row.publicationName ?
            <>
              <span className="cv-row__separator">, </span>
              <span className="cv-row__venue">{row.publicationName}</span>
            </>
          : null}
        </>
      )

    case 'award':
      return (
        <>
          <CvRowTitle title={row.awardName} hasPage={row.hasPage} slug={row.slug} />
          {row.organisation ?
            <>
              <span className="cv-row__separator">, </span>
              <span className="cv-row__venue">{row.organisation}</span>
            </>
          : null}
          {row.outcome && row.outcome !== 'winner' ?
            <span className="cv-row__outcome"> ({AWARD_OUTCOME_LABEL[row.outcome]})</span>
          : null}
        </>
      )

    case 'collection':
      return (
        <>
          <span className="cv-row__title">{row.institutionName}</span>
          {row.city ?
            <>
              <span className="cv-row__separator">, </span>
              <span className="cv-row__venue">{row.city}</span>
            </>
          : null}
        </>
      )

    default:
      return null
  }
}

export default function CvRow({ row }: { row: CvRowModel }) {
  const showYear = row.kind !== 'collection' && row.year

  return (
    <div className="cv-row">
      <div className="cv-row__year" aria-hidden={!showYear}>
        {showYear ? row.year : null}
      </div>
      <div className="cv-row__content">
        <CvRowContent row={row} />
      </div>
    </div>
  )
}

export function CvSection({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  return (
    <section className="cv-section">
      <h2 className="cv-section-header">{heading}</h2>
      <div className="cv-section__rows">{children}</div>
    </section>
  )
}

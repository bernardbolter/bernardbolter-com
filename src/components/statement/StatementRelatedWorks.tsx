import Link from 'next/link'

import type { StatementRelatedWork } from '@/helpers/statementRelatedWorks'

interface StatementRelatedWorksProps {
  items: StatementRelatedWork[]
}

export default function StatementRelatedWorks({ items }: StatementRelatedWorksProps) {
  if (!items.length) return null

  return (
    <section className="statement-related-works" aria-labelledby="statement-related-works-heading">
      <h3 id="statement-related-works-heading" className="statement-related-works__heading">
        Related works
      </h3>
      <ul className="statement-related-works__list">
        {items.map(({ id, artwork, note }) => (
          <li key={id} className="statement-related-works__item">
            <Link href={`/${artwork.slug}`} className="statement-related-works__card">
              {artwork.posterImage ?
                <span className="statement-related-works__thumb">
                  <img
                    src={artwork.posterImage.url}
                    alt={artwork.posterImageAltText || artwork.title}
                    width={artwork.posterImage.width}
                    height={artwork.posterImage.height}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              : null}
              <span className="statement-related-works__title">
                {artwork.title}
                {artwork.yearCreated ? `, ${artwork.yearCreated}` : ''}
              </span>
            </Link>
            {note ?
              <span className="statement-caption statement-related-works__note">{note}</span>
            : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

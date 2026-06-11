import Image from 'next/image'
import Link from 'next/link'

import { CloseCircleSvg } from '@/components/icons'
import HeaderTitle from '@/components/info/HeaderTitle'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { eventDisplayYear } from '@/lib/cv/buildCvSections'
import type { Event, Media } from '@/payload-types'

function mediaUrl(media: number | Media | null | undefined): string | null {
  if (!media || typeof media === 'number') return null
  return media.url ?? null
}

function formatDateRange(event: Event): string {
  const year = eventDisplayYear(event)
  if (event.startDate && event.endDate && event.startDate !== event.endDate) {
    return `${event.startDate} – ${event.endDate}`
  }
  if (event.startDate) return event.startDate
  return year
}

export default function EventPage({ event }: { event: Event }) {
  const description = lexicalToPlain(event.descriptionLong)
  const paragraphs = description
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean)
  const place = [event.venueName, event.venueCity, event.venueCountry].filter(Boolean).join(', ')
  const lat = event.venueLatLng?.lat
  const lng = event.venueLatLng?.lng
  const mapUrl =
    lat != null && lng != null ?
      `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`
    : null

  return (
    <div className="event-page__container">
      <HeaderTitle title={event.title} large />
      <Link href="/cv" className="event-page__close-container">
        <CloseCircleSvg />
        <p>close</p>
      </Link>

      <div className="event-page__content">
        <p className="event-page__meta">{formatDateRange(event)}</p>
        {place ? <p className="event-page__venue">{place}</p> : null}
        {event.venueAddress ? <p className="event-page__address">{event.venueAddress}</p> : null}

        {event.descriptionShort ? (
          <p className="event-page__lede">{event.descriptionShort}</p>
        ) : null}

        {paragraphs.length > 0 ? (
          <div className="event-page__body">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        {event.artistNote ? (
          <blockquote className="event-page__artist-note">{event.artistNote}</blockquote>
        ) : null}

        {event.pressQuote ? (
          <blockquote className="event-page__press-quote">{event.pressQuote}</blockquote>
        ) : null}

        {event.eventType === 'performance' && event.programmeContext ? (
          <p className="event-page__context">{event.programmeContext}</p>
        ) : null}

        {event.eventType === 'talk-panel' && event.eventFormatType ? (
          <p className="event-page__context">Format: {event.eventFormatType}</p>
        ) : null}

        {event.coExhibitors?.length ? (
          <section className="event-page__section">
            <h2>Co-exhibitors</h2>
            <ul>
              {event.coExhibitors.map((row, i) => (
                <li key={i}>
                  {row.name}
                  {row.role ? ` — ${row.role}` : ''}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {event.collaborators?.length ? (
          <section className="event-page__section">
            <h2>Collaborators</h2>
            <ul>
              {event.collaborators.map((row, i) => (
                <li key={i}>
                  {row.name} — {row.role}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {event.coSpeakers?.length ? (
          <section className="event-page__section">
            <h2>Co-speakers</h2>
            <ul>
              {event.coSpeakers.map((row, i) => (
                <li key={i}>
                  {row.name}
                  {row.role ? ` — ${row.role}` : ''}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {event.installationImages?.length ? (
          <section className="event-page__gallery">
            {event.installationImages.map((row, i) => {
              const url = mediaUrl(row.image)
              if (!url) return null
              return (
                <figure key={i} className="event-page__figure">
                  <Image
                    src={url}
                    alt={row.altText || row.caption || event.title}
                    width={1200}
                    height={800}
                    className="event-page__image"
                    sizes="(max-width: 768px) 100vw, 800px"
                  />
                  {row.caption ? <figcaption>{row.caption}</figcaption> : null}
                </figure>
              )
            })}
          </section>
        ) : null}

        {mapUrl ? (
          <section className="event-page__map">
            <a href={mapUrl} target="_blank" rel="noopener noreferrer">
              View on map
            </a>
          </section>
        ) : null}

        {event.mediaLinks?.length ? (
          <section className="event-page__section">
            <h2>Media</h2>
            <ul>
              {event.mediaLinks.map((link, i) => (
                <li key={i}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label || link.url}
                  </a>
                  {link.type ? ` (${link.type})` : ''}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {event.sameAs?.length ? (
          <section className="event-page__section event-page__links">
            <h2>References</h2>
            <ul>
              {event.sameAs.map((row, i) => (
                <li key={i}>
                  <a href={row.uri} target="_blank" rel="noopener noreferrer">
                    {row.uri}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}

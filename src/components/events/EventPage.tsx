import type { InstallationImageSlide } from '@/components/events/EventInstallationGallery'
import { EventArtworksShown } from '@/components/events/EventArtworksShown'
import { EventInstallationGallery } from '@/components/events/EventInstallationGallery'
import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { eventTypeDisplayLabel } from '@/lib/events/eventTypeLabel'
import { formatEventDateRange } from '@/lib/events/formatEventDateRange'
import { resolvePopulatedEventArtworks } from '@/lib/events/resolvePopulatedEventArtworks'
import { personDisplayName } from '@/utilities/personToJsonLd'
import type { Event, Media } from '@/payload-types'

function installationSlides(event: Event): InstallationImageSlide[] {
  const slides: InstallationImageSlide[] = []
  for (const row of event.installationImages ?? []) {
    const media = row.image
    if (!media || typeof media === 'number') continue
    const url = media.url?.trim()
    if (!url) continue
    slides.push({
      url,
      alt: row.altText?.trim() || row.caption?.trim() || event.title,
      caption: row.caption,
      width: media.width ?? 1000,
      height: media.height ?? 1000,
    })
  }
  return slides
}

function referenceLinks(event: Event): string[] {
  const uris = [
    ...(event.sameAs?.map((row) => row.uri?.trim()).filter((uri): uri is string => Boolean(uri)) ??
      []),
    ...(event.jsonldSameAs
      ?.map((row) => row.uri?.trim())
      .filter((uri): uri is string => Boolean(uri)) ?? []),
  ]
  return [...new Set(uris)]
}

export default function EventPage({ event }: { event: Event }) {
  const description = lexicalToPlain(event.descriptionLong)
  const paragraphs = description
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean)
  const typeLabel = eventTypeDisplayLabel(event.eventType)
  const place = [event.venueName, event.venueCity, event.venueCountry].filter(Boolean).join(', ')
  const shownArtworks = resolvePopulatedEventArtworks(event.artworks)
  const slides = installationSlides(event)
  const organiserName = personDisplayName(event.organiser)
  const curatorName = personDisplayName(event.curator)
  const showCurator = Boolean(curatorName && curatorName !== organiserName)
  const references = referenceLinks(event)

  return (
    <DocumentScrollShell
      title={event.title}
      titleLarge
      closeHref="/cv"
      showClose={false}
      scrollClassName="event-page__container"
      contentClassName="event-page__content"
      closeClassName="event-page__close-container"
    >
      <header className="event-page__header">
        {typeLabel ? <p className="event-page__type-pill">{typeLabel}</p> : null}
        <p className="event-page__meta">{formatEventDateRange(event)}</p>
        {place ? <p className="event-page__venue">{place}</p> : null}
        {event.venueAddress ? <p className="event-page__address">{event.venueAddress}</p> : null}
      </header>

      <EventInstallationGallery slides={slides} />

      {paragraphs.length > 0 ? (
        <div className="event-page__body">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      ) : null}

      {event.artistNote?.trim() ? (
        <blockquote className="event-page__artist-note">{event.artistNote.trim()}</blockquote>
      ) : null}

      <EventArtworksShown
        artworks={shownArtworks}
        presentationNote={event.artworkPresentationNote}
      />

      {organiserName || showCurator ? (
        <section className="event-page__section event-page__context-block">
          <h2>Context</h2>
          {organiserName ? <p>Organiser: {organiserName}</p> : null}
          {showCurator ? <p>Curator: {curatorName}</p> : null}
        </section>
      ) : null}

      {references.length > 0 ? (
        <section className="event-page__section event-page__links">
          <h2>References</h2>
          <ul>
            {references.map((uri) => (
              <li key={uri}>
                <a href={uri} target="_blank" rel="noopener noreferrer">
                  {uri}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </DocumentScrollShell>
  )
}

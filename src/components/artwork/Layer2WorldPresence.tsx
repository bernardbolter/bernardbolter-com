import Image from 'next/image'
import Link from 'next/link'

import { collectArtworkSameAsUris } from '@/lib/artwork/sameAsUris'
import { labelForSameAsUri } from '@/lib/artwork/sameAsDomainLabel'
import { getSeriesSiteUrl } from '@/lib/artwork/seriesSiteUrl'
import { resolveArtworkTopLevelSeries } from '@/lib/artwork/resolveTopLevelSeries'
import { getDocumentationVideoSource } from '@/lib/artwork/artworkGalleryImages'
import type { Artist, Artwork, Media } from '@/payload-types'

type Props = {
  artwork: Artwork
  artist: Artist | null
  hideEditions?: boolean
}

function mediaUrl(media: number | Media | null | undefined): string | null {
  if (!media || typeof media !== 'object' || !media.url) return null
  return media.url
}

function formatPrice(price: number, currency: string | null | undefined): string {
  const code = currency ?? 'EUR'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).format(price)
}

function locationLabel(artwork: Artwork, artist: Artist | null): string | null {
  const category = artwork.currentLocation?.category
  if (!category) return null

  switch (category) {
    case 'artists-studio':
      return `Currently in artist's studio${artist?.workCity1 ? `, ${artist.workCity1}` : ''}`
    case 'private-collection':
      return 'Private collection'
    case 'institution':
      return artwork.currentLocation?.locationDetail?.trim() || 'Institution'
    case 'on-loan':
      return 'Currently on loan'
    default:
      return null
  }
}

export default function Layer2WorldPresence({ artwork, artist, hideEditions = false }: Props) {
  const status = artwork.availabilityStatus ?? 'not-for-sale'
  const documentationVideo = getDocumentationVideoSource(artwork)
  const installationShots = artwork.installationShots ?? []
  const topSeries = resolveArtworkTopLevelSeries(artwork.series)
  const seriesSite = topSeries ? getSeriesSiteUrl(topSeries.slug) : null
  const sameAs = collectArtworkSameAsUris(artwork)
  const location = locationLabel(artwork, artist)
  const showDocsBlock = Boolean(documentationVideo || artwork.arEnabled || installationShots.length)

  return (
    <section className="artwork-page__layer artwork-page__layer--secondary">
      <div className="artwork-page__inner">
        <p className="artwork-page__section-title">Availability</p>
        {status === 'available' ? (
          <div className="artwork-image__info--available">
            <h2>This artwork is available</h2>
            {typeof artwork.askingPrice === 'number' ? (
              <div className="artwork-image__info--price-wrapper">
                <h3>{formatPrice(artwork.askingPrice, artwork.listingCurrency)}</h3>
                <p>shipping in the EU included</p>
              </div>
            ) : null}
            <p className="artwork-image__info--email">email for details</p>
            <h5>
              <Link href="/contact">bernardbolter@gmail.com</Link>
            </h5>
          </div>
        ) : null}
        {status === 'sold' ? (
          <>
            <span className="availability-pill availability-pill--muted">Sold</span>
            <p className="artwork-page__prose">This work has found a home.</p>
          </>
        ) : null}
        {status === 'not-for-sale' || status === 'reserved' || status === 'on-loan' ? (
          <>
            <span className="availability-pill availability-pill--muted">Not available</span>
            <p className="artwork-page__prose">Not available.</p>
          </>
        ) : null}
        {status === 'on-consignment' ? (
          <>
            <span className="availability-pill availability-pill--consignment">On consignment</span>
            <p className="artwork-page__prose">Available via gallery</p>
            {artwork.galleryReference ? (
              <p className="artwork-page__prose artwork-page__prose--secondary">
                {artwork.galleryReference}
              </p>
            ) : null}
            <Link href="/contact" className="series-card__cta mt-3 inline-block">
              Inquire by email
            </Link>
          </>
        ) : null}

        {!hideEditions && (artwork.editions ?? []).length > 0 ? (
          <>
            <hr className="artwork-page__divider" />
            <p className="artwork-page__section-title">Print editions</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(artwork.editions ?? []).map((edition) => (
                <div
                  key={edition.id ?? edition.formatLabel}
                  className="rounded border border-[var(--color-border-tertiary)] p-3 text-sm"
                >
                  <p className="font-medium">{edition.formatLabel}</p>
                  {edition.widthCm && edition.heightCm ? (
                    <p className="text-secondary">
                      {edition.widthCm} × {edition.heightCm} cm
                    </p>
                  ) : null}
                  {edition.substrate ? <p className="text-secondary">{edition.substrate}</p> : null}
                  {typeof edition.pricePerPrint === 'number' ? (
                    <p>{formatPrice(edition.pricePerPrint, edition.currency)}</p>
                  ) : null}
                  {typeof edition.remaining === 'number' && typeof edition.totalEditionSize === 'number' ? (
                    <p className="text-secondary">
                      {edition.remaining} of {edition.totalEditionSize} remaining
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            {artwork.editionNotes ? (
              <p className="artwork-page__prose mt-3">{artwork.editionNotes}</p>
            ) : null}
          </>
        ) : null}

        {showDocsBlock ? (
          <>
            <hr className="artwork-page__divider" />
            <p className="artwork-page__section-title">Documentation &amp; media</p>
            <div className="flex flex-col gap-2 text-sm">
              {documentationVideo ? (
                <a
                  href={documentationVideo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="series-card__cta inline-block w-fit"
                >
                  ▶ Documentation video
                </a>
              ) : null}
              {artwork.arEnabled && seriesSite ? (
                <a
                  href={seriesSite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="series-card__cta inline-block w-fit"
                >
                  ◈ AR experience — available on the series page
                </a>
              ) : null}
              {installationShots.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {installationShots.map((shot) => {
                    const url = mediaUrl(shot.image)
                    if (!url) return null
                    return (
                      <Image
                        key={shot.id ?? url}
                        src={url}
                        alt={shot.altText ?? 'Installation view'}
                        width={120}
                        height={90}
                        className="h-[4.5rem] w-[6rem] object-contain"
                      />
                    )
                  })}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {location ? (
          <>
            <hr className="artwork-page__divider" />
            <p className="artwork-page__section-title">Location</p>
            <p className="artwork-page__prose">{location}</p>
          </>
        ) : null}

        {sameAs.length > 0 ? (
          <>
            <hr className="artwork-page__divider" />
            <p className="artwork-page__section-title">External links</p>
            <div className="flex flex-wrap gap-2">
              {sameAs.map((uri) => (
                <a
                  key={uri}
                  href={uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="series-card__cta text-xs"
                >
                  {labelForSameAsUri(uri)}
                </a>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

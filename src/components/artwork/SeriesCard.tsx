import { getSeriesInitials } from '@/helpers/seriesInitals'
import { getSeriesColor } from '@/helpers/seriesColor'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { resolveArtworkTopLevelSeries } from '@/lib/artwork/resolveTopLevelSeries'
import { getSeriesSiteUrl } from '@/lib/artwork/seriesSiteUrl'
import type { Artwork, Series } from '@/payload-types'

type Props = {
  artwork: Artwork
}

function seriesDescriptionShort(description: Series['description']): string {
  const plain = lexicalToPlain(description)
  if (!plain) return ''
  return plain.length > 160 ? `${plain.slice(0, 157)}…` : plain
}

export default function SeriesCard({ artwork }: Props) {
  const topSeries = resolveArtworkTopLevelSeries(artwork.series)
  if (!topSeries) return null

  const seriesColor = getSeriesColor(topSeries.slug)
  const siteUrl = getSeriesSiteUrl(topSeries.slug)
  const swatchLabel = getSeriesInitials(topSeries.slug).toUpperCase() || topSeries.name.slice(0, 3).toUpperCase()
  const description = seriesDescriptionShort(topSeries.description)

  return (
    <section className="series-card artwork-page__layer">
      <div className="series-card__inner">
        <div className="series-card__swatch" style={{ backgroundColor: seriesColor }}>
          {swatchLabel}
        </div>
        <div>
          <p className="series-card__eyebrow">Part of a series</p>
          <h2 className="series-card__title">{topSeries.name}</h2>
          {description ? <p className="series-card__description">{description}</p> : null}
          {artwork.arEnabled ? (
            <p
              className="series-card__pill"
              style={{
                backgroundColor: `${seriesColor}1a`,
                border: `0.5px solid ${seriesColor}4d`,
                color: seriesColor,
              }}
            >
              ◈ AR experience available on the series page
            </p>
          ) : null}
          {siteUrl ? (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="series-card__cta"
            >
              Go to {topSeries.name} →
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}

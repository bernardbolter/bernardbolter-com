'use client'

import { convertSizeForDisplay } from '@/helpers/convertUnits'
import { useArtworks } from '@/providers/ArtworkProvider'

export { getArtworkSizeInput } from '@/lib/artwork/catalogueIdentity'

function FractionInches({
  whole,
  fraction,
}: {
  whole: string | null
  fraction: string
}) {
  return (
    <>
      {whole}
      {fraction ? (
        <>
          {' '}
          <span>{fraction}</span>
        </>
      ) : null}
      &quot;
    </>
  )
}

export default function ArtworkSize({
  width,
  height,
  units,
}: {
  width: string
  height: string
  units: string
}) {
  const [state] = useArtworks()
  const sizeColor = state.showSlideshow ? 'var(--title-light)' : 'var(--title-text)'

  if (width === '0') return null

  const converted = convertSizeForDisplay(width, height, units)

  if (units === 'pixels' && converted.widthPixels && converted.heightPixels) {
    return (
      <div className="artwork-size__container">
        <h4 className="artwork-title__size artwork-size__size" style={{ color: sizeColor }}>
          {converted.widthPixels}px x {converted.heightPixels}px
        </h4>
      </div>
    )
  }

  if (units === 'imperial') {
    return (
      <div className="artwork-size__container">
        <h4 className="artwork-title__size artwork-size__size" style={{ color: sizeColor }}>
          <FractionInches whole={converted.widthImperialInches} fraction={converted.widthImperialFraction} /> x{' '}
          <FractionInches whole={converted.heightImperialInches} fraction={converted.heightImperialFraction} />
        </h4>
        <h5 className="artwork-title__size--converted artwork-size__size--converted" style={{ color: sizeColor }}>
          {converted.widthMetric} x {converted.heightMetric}
        </h5>
      </div>
    )
  }

  return (
    <div className="artwork-size__container">
      <h4 className="artwork-title__size artwork-size__size" style={{ color: sizeColor }}>
        {converted.widthMetric} x {converted.heightMetric}
      </h4>
      <h5 className="artwork-title__size--converted artwork-size__size--converted" style={{ color: sizeColor }}>
        <FractionInches whole={converted.widthImperialInches} fraction={converted.widthImperialFraction} /> x{' '}
        <FractionInches whole={converted.heightImperialInches} fraction={converted.heightImperialFraction} />
      </h5>
    </div>
  )
}

'use client'

import { useState } from 'react'

import { convertSizeForDisplay } from '@/helpers/convertUnits'
import type { Artwork } from '@/payload-types'

type Props = {
  artwork: Pick<Artwork, 'widthMm' | 'heightMm' | 'widthPx' | 'heightPx' | 'measurementType'>
}

export default function ArtworkDimensionsRow({ artwork }: Props) {
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric')

  if (artwork.measurementType?.includes('digital') && artwork.widthPx && artwork.heightPx) {
    return (
      <span>
        {artwork.widthPx}px × {artwork.heightPx}px
      </span>
    )
  }

  if (!artwork.widthMm || !artwork.heightMm) return <span>—</span>

  const cmW = (artwork.widthMm / 10).toFixed(1)
  const cmH = (artwork.heightMm / 10).toFixed(1)
  const converted = convertSizeForDisplay(cmW, cmH, 'metric')

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`text-xs uppercase tracking-wide ${unit === 'metric' ? 'text-dark' : 'text-secondary'}`}
          onClick={() => setUnit('metric')}
        >
          cm
        </button>
        <span className="text-secondary">/</span>
        <button
          type="button"
          className={`text-xs uppercase tracking-wide ${unit === 'imperial' ? 'text-dark' : 'text-secondary'}`}
          onClick={() => setUnit('imperial')}
        >
          in
        </button>
      </div>
      {unit === 'metric' ? (
        <span>
          {converted.widthMetric} × {converted.heightMetric}
        </span>
      ) : (
        <span>
          {converted.widthImperialInches}
          {converted.widthImperialFraction ? ` ${converted.widthImperialFraction}` : ''}&quot; ×{' '}
          {converted.heightImperialInches}
          {converted.heightImperialFraction ? ` ${converted.heightImperialFraction}` : ''}&quot;
        </span>
      )}
    </div>
  )
}

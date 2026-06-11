'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import { useArtworks } from '@/providers/ArtworkProvider'

const SERIES_SLUGS = [
  'a-colorful-history',
  'megacities',
  'digital-city-series',
  'breaking-down-art',
  'art-collision',
  'vanishing-landscapes',
] as const

function pickRandomSeriesColor(): string {
  const slug = SERIES_SLUGS[Math.floor(Math.random() * SERIES_SLUGS.length)]
  return getSeriesColor(slug)
}

/** Series accent used by the hamburger plus and matching info-panel link icons. */
export function useMenuPlusColor(): string {
  const [state] = useArtworks()
  const pathname = usePathname()
  const [fallbackPlusColor] = useState(() => pickRandomSeriesColor())
  const [gridPlusColor, setGridPlusColor] = useState(() => pickRandomSeriesColor())

  const isHomeGrid =
    pathname === '/' && !state.artworkViewTimeline && !state.showSlideshow

  useEffect(() => {
    if (isHomeGrid) {
      setGridPlusColor(pickRandomSeriesColor())
    }
  }, [isHomeGrid])

  return useMemo(() => {
    if (isHomeGrid) return gridPlusColor

    const source = state.formattedArtworks?.artworksArray ?? state.filtered
    if (pathname === '/' && state.artworkViewTimeline && source.length > 0) {
      const safeIndex = Math.min(Math.max(0, state.currentArtworkIndex), source.length - 1)
      const artwork = source[safeIndex]
      return getSeriesColor(resolveSeriesSlug(artwork) ?? 'a-colorful-history')
    }

    return fallbackPlusColor
  }, [
    fallbackPlusColor,
    gridPlusColor,
    isHomeGrid,
    pathname,
    state.artworkViewTimeline,
    state.currentArtworkIndex,
    state.filtered,
    state.formattedArtworks?.artworksArray,
  ])
}

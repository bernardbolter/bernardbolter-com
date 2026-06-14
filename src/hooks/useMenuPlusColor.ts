'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import { isArtworkDetailPath } from '@/lib/routes/isArtworkDetailPath'
import { useArtworkPageMenuPlusColor } from '@/providers/ArtworkPageChromeContext'
import { useArtworks } from '@/providers/ArtworkProvider'

const SERIES_SLUGS = [
  'a-colorful-history',
  'megacities',
  'digital-city-series',
  'breaking-down-art',
  'art-collision',
  'vanishing-landscapes',
] as const

const DEFAULT_PLUS_COLOR = getSeriesColor('a-colorful-history')

function pickRandomSeriesColor(): string {
  const slug = SERIES_SLUGS[Math.floor(Math.random() * SERIES_SLUGS.length)]
  return getSeriesColor(slug)
}

function artworkSlugFromPathname(pathname: string): string | null {
  if (pathname.startsWith('/preview/artwork/')) {
    return pathname.split('/').filter(Boolean)[2] ?? null
  }
  if (pathname.startsWith('/artworks/')) {
    return pathname.split('/').filter(Boolean)[1] ?? null
  }
  if (isArtworkDetailPath(pathname)) {
    return pathname.split('/').filter(Boolean)[0] ?? null
  }
  return null
}

/** Series accent used by the hamburger plus and matching info-panel link icons. */
export function useMenuPlusColor(): string {
  const [state] = useArtworks()
  const pathname = usePathname()
  const pageMenuPlusColor = useArtworkPageMenuPlusColor()
  const [gridPlusColor, setGridPlusColor] = useState(DEFAULT_PLUS_COLOR)

  const isHomeGrid =
    pathname === '/' && !state.artworkViewTimeline && !state.showSlideshow

  useEffect(() => {
    if (isHomeGrid) {
      setGridPlusColor(pickRandomSeriesColor())
    } else {
      setGridPlusColor(DEFAULT_PLUS_COLOR)
    }
  }, [isHomeGrid])

  return useMemo(() => {
    if (pageMenuPlusColor) return pageMenuPlusColor
    if (isHomeGrid) return gridPlusColor

    const detailSlug = artworkSlugFromPathname(pathname)
    if (detailSlug) {
      const catalogue = state.original.length > 0 ? state.original : state.filtered
      const artwork = catalogue.find((row) => row.slug === detailSlug)
      if (artwork) {
        return getSeriesColor(resolveSeriesSlug(artwork) ?? 'a-colorful-history')
      }
    }

    const source = state.formattedArtworks?.artworksArray ?? state.filtered
    if (pathname === '/' && state.artworkViewTimeline && source.length > 0) {
      const safeIndex = Math.min(Math.max(0, state.currentArtworkIndex), source.length - 1)
      const artwork = source[safeIndex]
      return getSeriesColor(resolveSeriesSlug(artwork) ?? 'a-colorful-history')
    }

    return DEFAULT_PLUS_COLOR
  }, [
    pageMenuPlusColor,
    gridPlusColor,
    isHomeGrid,
    pathname,
    state.artworkViewTimeline,
    state.currentArtworkIndex,
    state.filtered,
    state.formattedArtworks?.artworksArray,
    state.original,
  ])
}

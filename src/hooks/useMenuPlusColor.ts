'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import { getSeriesColor } from '@/helpers/seriesColor'
import { artworkSlugFromPathname } from '@/lib/routes/artworkSlugFromPathname'
import { useArtworkChrome } from '@/providers/ArtworkChromeProvider'
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

/** Series accent used by the hamburger plus and matching info-panel link icons. */
export function useMenuPlusColor(): string {
  const { chrome } = useArtworkChrome()
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

    const map = chrome.seriesSlugByArtworkSlug

    // Artwork detail URL — prefer slim map (Option A); page chrome may also set colour.
    const detailSlug = artworkSlugFromPathname(pathname)
    if (detailSlug) {
      const seriesSlug = map[detailSlug]
      if (seriesSlug) return getSeriesColor(seriesSlug)
    }

    // Home timeline: colour tracks focused artwork via currentArtworkSlug + slim map.
    if (pathname === '/' && state.artworkViewTimeline && chrome.currentArtworkSlug) {
      const seriesSlug = map[chrome.currentArtworkSlug]
      if (seriesSlug) return getSeriesColor(seriesSlug)
    }

    return DEFAULT_PLUS_COLOR
  }, [
    pageMenuPlusColor,
    gridPlusColor,
    isHomeGrid,
    pathname,
    chrome.seriesSlugByArtworkSlug,
    chrome.currentArtworkSlug,
    state.artworkViewTimeline,
  ])
}

'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'

import { getSeriesColor } from '@/helpers/seriesColor'
import { artworkSlugFromPathname } from '@/lib/routes/artworkSlugFromPathname'
import { useArtworkChrome } from '@/providers/ArtworkChromeProvider'
import { useArtworkPageMenuPlusColor } from '@/providers/ArtworkPageChromeContext'
import { useArtworks } from '@/providers/ArtworkProvider'

const DEFAULT_PLUS_COLOR = getSeriesColor('a-colorful-history')
/** Grid unfiltered: do not pick a series arbitrarily. */
const NEUTRAL_PLUS_COLOR = '#696969'

/** Series accent used by the hamburger plus and matching info-panel link icons. */
export function useMenuPlusColor(): string {
  const { chrome } = useArtworkChrome()
  const [state] = useArtworks()
  const pathname = usePathname()
  const pageMenuPlusColor = useArtworkPageMenuPlusColor()

  const isHomeGrid =
    pathname === '/' && !state.artworkViewTimeline && !state.showSlideshow

  return useMemo(() => {
    if (pageMenuPlusColor) return pageMenuPlusColor

    if (isHomeGrid) {
      if (state.filtersArray.length === 1) {
        return getSeriesColor(state.filtersArray[0]!)
      }
      return NEUTRAL_PLUS_COLOR
    }

    const map = chrome.seriesSlugByArtworkSlug

    const detailSlug = artworkSlugFromPathname(pathname)
    if (detailSlug) {
      const seriesSlug = map[detailSlug]
      if (seriesSlug) return getSeriesColor(seriesSlug)
    }

    if (pathname === '/' && state.artworkViewTimeline && chrome.currentArtworkSlug) {
      const seriesSlug = map[chrome.currentArtworkSlug]
      if (seriesSlug) return getSeriesColor(seriesSlug)
    }

    return DEFAULT_PLUS_COLOR
  }, [
    pageMenuPlusColor,
    isHomeGrid,
    pathname,
    chrome.seriesSlugByArtworkSlug,
    chrome.currentArtworkSlug,
    state.artworkViewTimeline,
    state.filtersArray,
    state.showSlideshow,
  ])
}

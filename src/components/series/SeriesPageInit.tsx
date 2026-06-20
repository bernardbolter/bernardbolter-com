'use client'

import { useEffect, useRef } from 'react'

import { useArtworks } from '@/providers/ArtworkProvider'

interface SeriesPageInitProps {
  seriesSlug: string
}

/** Applies grid view + series filter once when landing on /series/[slug]. */
export default function SeriesPageInit({ seriesSlug }: SeriesPageInitProps) {
  const [, setState] = useArtworks()
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    setState((prev) => ({
      ...prev,
      artworkViewTimeline: false,
      filtersArray: [seriesSlug],
      currentArtworkIndex: 0,
      savedTimelineIndex: 0,
      savedTimelineFiltersHash: '',
    }))
  }, [seriesSlug, setState])

  return null
}

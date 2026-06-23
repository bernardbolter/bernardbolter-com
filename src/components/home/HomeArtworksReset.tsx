'use client'

import { useEffect, useRef } from 'react'

import { useArtworks } from '@/providers/ArtworkProvider'

/** Restores homepage defaults (timeline, no filters) on each visit to /. */
export default function HomeArtworksReset() {
  const [, setState] = useArtworks()
  const didReset = useRef(false)

  useEffect(() => {
    if (didReset.current) return
    didReset.current = true

    setState((prev) => ({
      ...prev,
      filtersArray: [],
      isAvailableFilter: false,
      searchValue: '',
      filterNavOpen: false,
      searchNavOpen: false,
      showSlideshow: false,
      slideshowPlaying: false,
      currentArtworkIndex: 0,
      savedTimelineIndex: 0,
      savedTimelineFiltersHash: '',
    }))
  }, [setState])

  return null
}

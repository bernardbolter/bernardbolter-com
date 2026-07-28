'use client'

import { useEffect, useRef } from 'react'

import { useArtworks } from '@/providers/ArtworkProvider'

/**
 * Soft home reset: close overlays / leave slideshow when landing on `/`.
 * Do NOT clear filters, search, or timeline position — those must survive
 * artwork → home navigation.
 */
export default function HomeArtworksReset() {
  const [, setState] = useArtworks()
  const didReset = useRef(false)

  useEffect(() => {
    if (didReset.current) return
    didReset.current = true

    setState((prev) => ({
      ...prev,
      filterNavOpen: false,
      searchNavOpen: false,
      showSlideshow: false,
      slideshowPlaying: false,
    }))
  }, [setState])

  return null
}

'use client'

import { useMemo } from 'react'
import { useArtworks } from '@/providers/ArtworkProvider'
import ArtworksGrid from './ArtworksGrid'
import ArtworksSlideshow from './ArtworksSlideshow'
import ArtworkSwitcher from './ArtworkSwitcher'
import ArtworkTitle from './ArtworkTitle'
import Timeline from './Timeline'

export default function Artworks() {
  const [state] = useArtworks()
  const showSwitcher = (state.viewportWidth || 0) >= 550 && !state.showSlideshow

  const summary = useMemo(() => {
    if (state.filtered.length === 0) return 'No artworks found'
    return `${state.filtered.length} artworks`
  }, [state.filtered.length])

  if (state.filtered.length === 0) {
    return (
      <section className="relative z-artwork flex min-h-screen items-center justify-center px-space-6">
        <div className="text-center font-heading text-base text-secondary">No artworks found</div>
      </section>
    )
  }

  return (
    <section className="relative z-artwork min-h-screen w-full">
      {showSwitcher && (
        <ArtworkSwitcher />
      )}

      <div className="fixed bottom-space-2 right-space-2 z-nav rounded bg-surface-nav/80 px-space-2 py-space-1 font-heading text-xs text-secondary">
        {summary}
      </div>

      {state.showSlideshow ? (
        <ArtworksSlideshow />
      ) : state.artworkViewTimeline || (state.viewportWidth || 0) < 550 ? (
        <Timeline />
      ) : (
        <ArtworksGrid />
      )}

      {state.totalCount > state.withImagesCount && (
        <div className="fixed bottom-[2.25rem] right-space-2 z-nav rounded bg-surface-nav/80 px-space-2 py-space-1 font-heading text-xs text-secondary">
          {state.totalCount - state.withImagesCount} items hidden (no image)
        </div>
      )}

      <ArtworkTitle />
    </section>
  )
}

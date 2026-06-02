'use client'

import { useMemo } from 'react'
import { useArtworks } from '@/providers/ArtworkProvider'
import ArtworksGrid from './ArtworksGrid'
import ArtworkSwitcher from './ArtworkSwitcher'
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
        <div className="flex min-h-screen items-center justify-center px-space-6">
          <div className="max-w-[30rem] text-center">
            <h2 className="font-heading text-xl text-dark">Slideshow mode</h2>
            <p className="mt-space-2 font-heading text-sm text-secondary">
              Slideshow rendering is the next phase step; controls are wired and state is active.
            </p>
          </div>
        </div>
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
    </section>
  )
}

'use client'

import { useMemo } from 'react'
import { useArtworks } from '@/providers/ArtworkProvider'
import Timeline from './Timeline'

export default function Artworks() {
  const [state, setState] = useArtworks()
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
        <div className="fixed bottom-space-4 left-1/2 z-ui-top -translate-x-1/2 rounded-[0.375rem] bg-surface-nav p-space-1 shadow-sm">
          <div className="flex items-center gap-space-1">
            <button
              className={`px-space-3 py-space-1 font-heading text-sm ${
                state.artworkViewTimeline ? 'bg-ui-face text-dark' : 'text-secondary'
              }`}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  artworkViewTimeline: true,
                }))
              }
            >
              Timeline
            </button>
            <button
              className={`px-space-3 py-space-1 font-heading text-sm ${
                !state.artworkViewTimeline ? 'bg-ui-face text-dark' : 'text-secondary'
              }`}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  artworkViewTimeline: false,
                }))
              }
            >
              Grid
            </button>
          </div>
        </div>
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
        <div className="flex min-h-screen items-center justify-center px-space-6">
          <div className="max-w-[30rem] text-center">
            <h2 className="font-heading text-xl text-dark">Grid mode</h2>
            <p className="mt-space-2 font-heading text-sm text-secondary">
              Grid composition is queued for the next phase and will replace this placeholder.
            </p>
          </div>
        </div>
      )}

      {state.totalCount > state.withImagesCount && (
        <div className="fixed bottom-[2.25rem] right-space-2 z-nav rounded bg-surface-nav/80 px-space-2 py-space-1 font-heading text-xs text-secondary">
          {state.totalCount - state.withImagesCount} items hidden (no image)
        </div>
      )}
    </section>
  )
}

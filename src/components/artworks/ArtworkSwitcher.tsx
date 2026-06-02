'use client'

import { useArtworks } from '@/providers/ArtworkProvider'

export default function ArtworkSwitcher() {
  const [state, setState] = useArtworks()

  return (
    <button
      className="fixed bottom-space-4 left-1/2 z-ui-top flex -translate-x-1/2 items-center gap-space-2 rounded-[0.375rem] bg-surface-nav p-space-1 shadow-sm"
      onClick={() =>
        setState((prev) => ({
          ...prev,
          artworkViewTimeline: !prev.artworkViewTimeline,
        }))
      }
    >
      <p
        className={`px-space-2 py-space-1 font-heading text-sm ${
          state.artworkViewTimeline ? 'text-dark' : 'text-secondary'
        }`}
      >
        Timeline
      </p>
      <div className="flex h-[1.375rem] w-[2.75rem] items-center rounded-full bg-ui-face px-[0.1875rem]">
        <div
          className={`h-[1rem] w-[1rem] rounded-full bg-dark transition-transform duration-300 ${
            state.artworkViewTimeline ? 'translate-x-0' : 'translate-x-[1.25rem]'
          }`}
        />
      </div>
      <p
        className={`px-space-2 py-space-1 font-heading text-sm ${
          !state.artworkViewTimeline ? 'text-dark' : 'text-secondary'
        }`}
      >
        Grid
      </p>
    </button>
  )
}

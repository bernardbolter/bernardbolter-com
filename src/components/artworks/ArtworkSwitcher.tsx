'use client'

import { useMenuPlusColor } from '@/hooks/useMenuPlusColor'
import { useArtworks } from '@/providers/ArtworkProvider'

export default function ArtworkSwitcher() {
  const [state, setState] = useArtworks()
  const plusColor = useMenuPlusColor()
  const isDesktopSwitcher = (state.viewportWidth || 0) > 767

  const toggleTrack = (
    <div className="mx-[2px] flex h-[1.125rem] w-[2.5rem] items-center rounded-full border border-ui-line bg-ui-face p-[3px]">
      <div
        className={`h-3 w-3 shrink-0 rounded-full transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          state.artworkViewTimeline ? 'translate-x-0' : 'translate-x-[22px]'
        }`}
        style={{ backgroundColor: plusColor }}
      />
    </div>
  )

  return (
    <button
      type="button"
      className={
        isDesktopSwitcher
          ? 'fixed top-0 z-[4001] ml-[40%] flex cursor-pointer flex-row items-center rounded-b-[0.375rem] bg-surface-nav px-[5px] py-[3px] m:ml-[55%] m:-translate-x-[55%]'
          : 'fixed bottom-space-4 left-1/2 z-ui-top flex -translate-x-1/2 cursor-pointer items-center gap-space-2 rounded-[0.375rem] bg-surface-nav p-space-1 shadow-sm'
      }
      onClick={() =>
        setState((prev) => ({
          ...prev,
          artworkViewTimeline: !prev.artworkViewTimeline,
        }))
      }
    >
      <p
        className={`m-0 cursor-pointer px-[2px] font-heading text-xs font-extrabold uppercase ${
          state.artworkViewTimeline ? 'text-primary' : 'text-secondary'
        }`}
      >
        Timeline
      </p>
      {toggleTrack}
      <p
        className={`m-0 cursor-pointer px-[2px] font-heading text-xs font-extrabold uppercase ${
          !state.artworkViewTimeline ? 'text-primary' : 'text-secondary'
        }`}
      >
        Grid
      </p>
    </button>
  )
}

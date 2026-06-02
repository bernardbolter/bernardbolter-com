'use client'

import useWindowSize from '@/hooks/useWindowSize'
import { useArtworks } from '@/providers/ArtworkProvider'
import { FilterSvg, PauseSvg, PlaySvg, SearchSvg, TimerSvg } from '@/components/icons'

import FilterNav from './FilterNav'
import SearchNav from './SearchNav'

export default function Nav() {
  const [state, setState] = useArtworks()
  const size = useWindowSize()

  return (
    <nav
      className="fixed right-0 z-ui-top flex flex-col gap-space-2 p-space-2"
      style={{
        top: !state.artworkViewTimeline
          ? 4
          : state.showSlideshow
            ? 4
            : size.width && size.width > 768
              ? 130
              : 4,
      }}
    >
      <button
        className="h-[2.125rem] w-[2.0625rem] border border-ui-line bg-surface-nav p-space-1"
        style={{ display: state.showSlideshow ? 'block' : 'none' }}
      >
        <TimerSvg />
      </button>

      <button
        className="h-[2.125rem] w-[2.0625rem] border border-ui-line bg-surface-nav p-space-1"
        onClick={() =>
          setState((prev) => ({
            ...prev,
            searchNavOpen: !prev.searchNavOpen,
            searchValue: '',
          }))
        }
        style={{ display: state.showSlideshow ? 'none' : 'block' }}
      >
        <SearchSvg searchNavOpen={state.searchNavOpen} />
      </button>
      <SearchNav />

      <button
        className="h-[2.125rem] w-[2.0625rem] border border-ui-line bg-surface-nav p-space-1"
        onClick={() =>
          setState((prev) => {
            const nextShowSlideshow = !prev.showSlideshow
            return {
              ...prev,
              showSlideshow: nextShowSlideshow,
              slideshowPlaying: nextShowSlideshow,
              isTimelineScrollingProgamatically: prev.showSlideshow,
            }
          })
        }
      >
        <PlaySvg showSlideshow={state.showSlideshow} />
      </button>

      <button
        className="h-[2.125rem] w-[2.0625rem] border border-ui-line bg-surface-nav p-space-1"
        onClick={() => setState((prev) => ({ ...prev, filterNavOpen: !prev.filterNavOpen }))}
        style={{ display: state.showSlideshow ? 'none' : 'block' }}
      >
        <FilterSvg filterNavOpen={state.filterNavOpen} />
      </button>
      <FilterNav />

      <button
        className="h-[2.125rem] w-[2.0625rem] border border-ui-line bg-surface-nav p-space-1"
        onClick={() => setState((prev) => ({ ...prev, slideshowPlaying: !prev.slideshowPlaying }))}
        style={{ display: state.showSlideshow ? 'block' : 'none' }}
      >
        <PauseSvg />
      </button>
    </nav>
  )
}

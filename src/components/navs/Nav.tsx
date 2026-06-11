'use client'

import {
  FilterSvg,
  PauseSvg,
  PlaySvg,
  SearchSvg,
  TimerSvg,
} from '@/components/icons'
import useWindowSize from '@/hooks/useWindowSize'
import { useArtworks } from '@/providers/ArtworkProvider'

import FilterNav from './FilterNav'
import SearchNav from './SearchNav'

export default function Nav() {
  const [state, setState] = useArtworks()
  const size = useWindowSize()

  return (
    <nav
      className="nav-container"
      style={{
        zIndex: 5001,
        top: !state.artworkViewTimeline
          ? 4
          : state.showSlideshow
            ? 4
            : size.width && size.width > 768
              ? 130
              : 4,
      }}
    >
      <div
        className="nav-button"
        role="button"
        tabIndex={0}
        style={{ display: state.showSlideshow ? 'block' : 'none' }}
      >
        <TimerSvg />
      </div>

      <div
        className={
          state.searchNavOpen
            ? 'nav-button search-button search-button--open'
            : 'nav-button search-button'
        }
        role="button"
        tabIndex={0}
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
      </div>
      <SearchNav />

      <div
        className="nav-button"
        role="button"
        tabIndex={0}
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
      </div>

      <div
        className={
          state.filterNavOpen
            ? 'nav-button filter-button filter-button--open'
            : 'nav-button filter-button'
        }
        role="button"
        tabIndex={0}
        onClick={() => setState((prev) => ({ ...prev, filterNavOpen: !prev.filterNavOpen }))}
        style={{ display: state.showSlideshow ? 'none' : 'block' }}
      >
        <FilterSvg filterNavOpen={state.filterNavOpen} />
      </div>
      <FilterNav />

      <div
        className="nav-button"
        role="button"
        tabIndex={0}
        onClick={() => setState((prev) => ({ ...prev, slideshowPlaying: !prev.slideshowPlaying }))}
        style={{ display: state.showSlideshow ? 'block' : 'none' }}
      >
        <PauseSvg />
      </div>
    </nav>
  )
}

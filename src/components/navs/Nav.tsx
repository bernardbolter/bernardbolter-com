'use client'

import {
  FilterSvg,
  PauseSvg,
  PlaySvg,
  SearchSvg,
  TimerSvg,
} from '@/components/icons'
import { closeSearchNavState } from '@/helpers/navSearch'
import { getNavContainerTop } from '@/helpers/navLayout'
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
        top: getNavContainerTop(state, size),
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
          state.filterNavOpen
            ? 'nav-button filter-button filter-button--open'
            : 'nav-button filter-button'
        }
        role="button"
        tabIndex={0}
        onClick={() =>
          setState((prev) => {
            const opening = !prev.filterNavOpen
            if (opening) {
              return { ...closeSearchNavState(prev), filterNavOpen: true }
            }
            return { ...prev, filterNavOpen: false }
          })
        }
        style={{ display: state.showSlideshow ? 'none' : 'block' }}
      >
        <FilterSvg filterNavOpen={state.filterNavOpen} />
      </div>
      <FilterNav />

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

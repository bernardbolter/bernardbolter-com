'use client'

import {
  CloseCircleSvg,
  FilterLightSvg,
  SortSvg,
} from '@/components/icons'
import { filterValues } from '@/data/filterValues'
import { sortValues } from '@/data/sortValues'
import useWindowSize from '@/hooks/useWindowSize'
import { useArtworks } from '@/providers/ArtworkProvider'

import FilterItem from './FilterItem'
import SortItem from './SortItem'

export default function FilterNav() {
  const [state, setState] = useArtworks()
  const size = useWindowSize()

  return (
    <div
      className={
        state.filterNavOpen
          ? 'filter-nav__container filter-nav__container--open'
          : 'filter-nav__container'
      }
      style={{
        top:
          size.width && size.width < 768
            ? 79
            : state.artworkViewTimeline
              ? 204
              : 79,
        display: state.showSlideshow ? 'none' : '',
        maxHeight:
          size.width && size.width < 768
            ? (size.height || 500) - 83
            : state.artworkViewTimeline
              ? (size.height || 400) - 210
              : (size.height || 500) - 83,
      }}
    >
      <div className="filter-nav__container--inner">
        <div
          className="filter-nav__close-container"
          onClick={() =>
            setState((prev) => ({
              ...prev,
              filtersArray: [],
              searchValue: '',
              filterNavOpen: false,
            }))
          }
          role="button"
          tabIndex={0}
        >
          <CloseCircleSvg />
          <p>clear</p>
        </div>

        <div className="filter-nav__header filter-nav__header--sort">
          <h3>Sort</h3>
          <SortSvg />
        </div>

        <div className="filter-nav__line" />

        <div className="filter-nav__content">
          {sortValues.map((value) => (
            <SortItem key={value.id} {...value} />
          ))}
        </div>

        <div className="filter-nav__header filter-nav__header--filters">
          <h3>Filters</h3>
          <FilterLightSvg />
        </div>

        <div className="filter-nav__line" />

        <div
          className="filter-nav__item--container"
          onClick={() =>
            setState((prev) => ({ ...prev, isAvailableFilter: !prev.isAvailableFilter }))
          }
          role="button"
          tabIndex={0}
        >
          <p
            className={
              state.isAvailableFilter
                ? 'filter-nav__name filter-nav__name--active'
                : 'filter-nav__name'
            }
          >
            Available
          </p>
          <div
            className="filter-nav__box"
            style={{
              backgroundColor: '#d4af37',
              borderRadius: state.isAvailableFilter ? '50%' : '',
            }}
          />
        </div>

        <div className="filter-nav__line" />

        <div className="filter-nav__content">
          {filterValues.map((value) => (
            <FilterItem key={value.id} {...value} />
          ))}
        </div>
      </div>
    </div>
  )
}

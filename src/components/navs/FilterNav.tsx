'use client'

import useWindowSize from '@/hooks/useWindowSize'
import { useArtworks } from '@/providers/ArtworkProvider'
import { filterValues } from '@/data/filterValues'
import { sortValues } from '@/data/sortValues'
import { CloseCircleSvg, FilterSvg, SortSvg } from '@/components/icons'

import FilterItem from './FilterItem'
import SortItem from './SortItem'

export default function FilterNav() {
  const [state, setState] = useArtworks()
  const size = useWindowSize()

  return (
    <div
      className={`fixed right-[3.625rem] z-nav w-[16rem] bg-surface-nav p-space-3 transition-transform duration-300 ${
        state.filterNavOpen ? 'translate-x-0' : 'translate-x-[120%]'
      }`}
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
      <div
        className="mb-space-2 flex cursor-pointer items-center gap-space-2"
        onClick={() =>
          setState((prev) => ({
            ...prev,
            filtersArray: [],
            searchValue: '',
            filterNavOpen: false,
          }))
        }
      >
        <div className="h-6 w-6 fill-dark">
          <CloseCircleSvg />
        </div>
        <p className="font-heading text-sm text-secondary">clear</p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-dark">Sort</h3>
        <div className="h-5 w-5 fill-dark">
          <SortSvg />
        </div>
      </div>
      <div className="my-space-2 h-px w-[1.875rem] bg-dark" />

      <div className="mb-space-3">
        {sortValues.map((value) => (
          <SortItem key={value.id} {...value} />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-dark">Filters</h3>
        <div className="h-5 w-5 fill-dark">
          <FilterSvg />
        </div>
      </div>
      <div className="my-space-2 h-px w-[1.875rem] bg-dark" />

      <div
        className="flex cursor-pointer items-center justify-between py-space-2"
        onClick={() => setState((prev) => ({ ...prev, isAvailableFilter: !prev.isAvailableFilter }))}
      >
        <p
          className={`m-0 font-heading text-sm ${
            state.isAvailableFilter ? 'font-bold text-dark' : 'font-normal text-secondary'
          }`}
        >
          Available
        </p>
        <div
          className="h-3 w-3 border border-ui-line"
          style={{
            backgroundColor: '#d4af37',
            borderRadius: state.isAvailableFilter ? '50%' : '0',
          }}
        />
      </div>

      <div className="my-space-2 h-px w-[1.875rem] bg-dark" />
      <div className="overflow-y-auto">
        {filterValues.map((value) => (
          <FilterItem key={value.id} {...value} />
        ))}
      </div>
    </div>
  )
}

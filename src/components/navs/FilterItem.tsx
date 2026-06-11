'use client'

import { useArtworks } from '@/providers/ArtworkProvider'
import type { FilterCategory } from '@/types/frontend'

export default function FilterItem({ name, slug, color }: FilterCategory) {
  const [state, setState] = useArtworks()
  const active = state.filtersArray.includes(slug)

  return (
    <div
      className="filter-nav__item--container"
      onClick={() =>
        setState((prev) => ({
          ...prev,
          filtersArray: prev.filtersArray.includes(slug)
            ? prev.filtersArray.filter((filter) => filter !== slug)
            : [...prev.filtersArray, slug],
        }))
      }
      role="button"
      tabIndex={0}
    >
      <p className={active ? 'filter-nav__name filter-nav__name--active' : 'filter-nav__name'}>
        {name}
      </p>
      <div
        className="filter-nav__box"
        style={{
          backgroundColor: color,
          borderRadius: active ? '50%' : '',
        }}
      />
    </div>
  )
}

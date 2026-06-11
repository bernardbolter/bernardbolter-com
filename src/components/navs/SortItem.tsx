'use client'

import { useArtworks } from '@/providers/ArtworkProvider'
import type { SortOption } from '@/types/frontend'

export default function SortItem({ slug, name }: SortOption) {
  const [state, setState] = useArtworks()
  const active = state.sorting === slug

  return (
    <div
      className="sort-nav__item--container"
      onClick={() => setState((prev) => ({ ...prev, sorting: slug }))}
      role="button"
      tabIndex={0}
    >
      <p className={active ? 'filter-nav__name filter-nav__name--active' : 'filter-nav__name'}>
        {name}
      </p>
      <div
        className="filter-nav__box sorting-nav__box"
        style={{
          borderRadius: active ? '50%' : '',
        }}
      />
    </div>
  )
}

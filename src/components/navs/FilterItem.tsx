'use client'

import { useArtworks } from '@/providers/ArtworkProvider'
import type { FilterCategory } from '@/types/frontend'

export default function FilterItem({ name, slug, color }: FilterCategory) {
  const [state, setState] = useArtworks()
  const active = state.filtersArray.includes(slug)

  return (
    <div
      className="flex cursor-pointer items-center justify-between py-space-2"
      onClick={() =>
        setState((prev) => ({
          ...prev,
          filtersArray: prev.filtersArray.includes(slug)
            ? prev.filtersArray.filter((filter) => filter !== slug)
            : [...prev.filtersArray, slug],
        }))
      }
    >
      <p className={`m-0 font-heading text-sm ${active ? 'font-bold text-dark' : 'font-normal text-secondary'}`}>
        {name}
      </p>
      <div
        className="h-3 w-3 border border-ui-line"
        style={{ backgroundColor: color, borderRadius: active ? '50%' : '0' }}
      />
    </div>
  )
}

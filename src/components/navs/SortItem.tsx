'use client'

import { useArtworks } from '@/providers/ArtworkProvider'
import type { SortOption } from '@/types/frontend'

export default function SortItem({ slug, name }: SortOption) {
  const [state, setState] = useArtworks()
  const active = state.sorting === slug

  return (
    <div
      className="flex cursor-pointer items-center justify-between py-space-2"
      onClick={() => setState((prev) => ({ ...prev, sorting: slug }))}
    >
      <p className={`m-0 font-heading text-sm ${active ? 'font-bold text-dark' : 'font-normal text-secondary'}`}>
        {name}
      </p>
      <div className="h-3 w-3 border border-ui-line bg-ui-face" style={{ borderRadius: active ? '50%' : '0' }} />
    </div>
  )
}

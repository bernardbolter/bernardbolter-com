'use client'

import { useArtworks } from '@/providers/ArtworkProvider'

export default function AnimatedHamburgerMenu() {
  const [state] = useArtworks()

  return (
    <div className={`relative h-full w-full ${state.infoOpen ? 'menu-trigger-open' : ''}`}>
      <span className="menu-lines absolute left-[20%] top-1/2 block h-[2px] w-[60%] -translate-y-1/2 bg-[var(--ui-icon)]" />
      <div className="menu-plus absolute bottom-0 right-2 h-[14px] w-[14px]" />
    </div>
  )
}

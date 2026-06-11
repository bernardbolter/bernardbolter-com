'use client'

import { useArtworks } from '@/providers/ArtworkProvider'
import { useMenuPlusColor } from '@/hooks/useMenuPlusColor'

export default function AnimatedHamburgerMenu() {
  const [state] = useArtworks()
  const plusColor = useMenuPlusColor()

  return (
    <div
      className={`menu-link relative h-full w-full ${state.infoOpen ? 'menu-trigger-open' : ''}`}
      style={{ ['--menu-plus-color' as string]: plusColor }}
    >
      <span className="menu-lines absolute left-[20%] top-1/2 block h-[2px] w-[55%] bg-[var(--ui-icon)]" />
      <div className="menu-plus absolute bottom-0 right-2 h-3 w-3" />
    </div>
  )
}

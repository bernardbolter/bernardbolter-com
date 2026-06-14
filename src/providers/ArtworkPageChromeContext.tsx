'use client'

import { createContext, useContext, type ReactNode } from 'react'

const ArtworkPageChromeContext = createContext<string | null>(null)

type Props = {
  menuPlusColor: string
  children: ReactNode
}

/** Supplies deterministic series accent for Info chrome on artwork detail pages. */
export function ArtworkPageChromeProvider({ menuPlusColor, children }: Props) {
  return (
    <ArtworkPageChromeContext.Provider value={menuPlusColor}>
      {children}
    </ArtworkPageChromeContext.Provider>
  )
}

export function useArtworkPageMenuPlusColor(): string | null {
  return useContext(ArtworkPageChromeContext)
}

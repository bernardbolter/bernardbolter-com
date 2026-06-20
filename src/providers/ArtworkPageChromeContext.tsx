'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type NavBackLink = {
  href: string
  label: string
}

type ArtworkPageChrome = {
  menuPlusColor: string
  navBackLink?: NavBackLink
}

const ArtworkPageChromeContext = createContext<ArtworkPageChrome | null>(null)

type Props = {
  menuPlusColor: string
  navBackLink?: NavBackLink
  children: ReactNode
}

/** Supplies deterministic series accent and optional nav overrides for artwork-related pages. */
export function ArtworkPageChromeProvider({ menuPlusColor, navBackLink, children }: Props) {
  return (
    <ArtworkPageChromeContext.Provider value={{ menuPlusColor, navBackLink }}>
      {children}
    </ArtworkPageChromeContext.Provider>
  )
}

export function useArtworkPageMenuPlusColor(): string | null {
  return useContext(ArtworkPageChromeContext)?.menuPlusColor ?? null
}

export function useArtworkPageNavBackLink(): NavBackLink | null {
  return useContext(ArtworkPageChromeContext)?.navBackLink ?? null
}

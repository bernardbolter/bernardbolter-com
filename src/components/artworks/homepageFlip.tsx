'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type HomepageFlipContextValue = {
  flippedSlug: string | null
  setFlippedSlug: (slug: string | null | ((prev: string | null) => string | null)) => void
}

const HomepageFlipContext = createContext<HomepageFlipContextValue>({
  flippedSlug: null,
  setFlippedSlug: () => {},
})

export function HomepageFlipProvider({
  value,
  children,
}: {
  value: HomepageFlipContextValue
  children: ReactNode
}) {
  return <HomepageFlipContext.Provider value={value}>{children}</HomepageFlipContext.Provider>
}

export function useHomepageFlip(): HomepageFlipContextValue {
  return useContext(HomepageFlipContext)
}

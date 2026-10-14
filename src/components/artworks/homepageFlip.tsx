'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type HomepageFlipContextValue = {
  flippedSlug: string | null
  setFlippedSlug: (slug: string | null | ((prev: string | null) => string | null)) => void
  /** Timeline focus slug — flip-open only allowed for this work (auto-unflip still runs on scroll). */
  currentTimelineSlug: string | null
}

const HomepageFlipContext = createContext<HomepageFlipContextValue>({
  flippedSlug: null,
  setFlippedSlug: () => {},
  currentTimelineSlug: null,
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

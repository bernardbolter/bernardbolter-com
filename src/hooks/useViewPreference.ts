'use client'

import { useEffect, useState } from 'react'

const VIEW_KEY = 'bb-view-preference'

export type ViewPreference = 'timeline' | 'grid'

function readStoredView(): ViewPreference {
  if (typeof window === 'undefined') return 'timeline'
  const stored = localStorage.getItem(VIEW_KEY)
  return stored === 'grid' ? 'grid' : 'timeline'
}

export function useViewPreference() {
  const [view, setViewState] = useState<ViewPreference>('timeline')

  useEffect(() => {
    setViewState(readStoredView())
  }, [])

  const setView = (next: ViewPreference) => {
    setViewState(next)
    localStorage.setItem(VIEW_KEY, next)
  }

  return [view, setView] as const
}

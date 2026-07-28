'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  buildCorpusIndexQueryString,
  parseCorpusIndexFilters,
  corpusIndexHasActiveFilters,
} from '@/lib/corpus/corpusIndexFilters'

const STORAGE_KEY = 'bb.corpusIndexQuery'

/** Persist / restore `/corpus` filter query across artwork drill-downs. */
export default function CorpusFiltersPersist() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname !== '/corpus') return

    const current = searchParams?.toString() ?? ''
    const filters = parseCorpusIndexFilters(searchParams ?? new URLSearchParams())

    if (corpusIndexHasActiveFilters(filters)) {
      const qs = buildCorpusIndexQueryString(filters)
      try {
        sessionStorage.setItem(STORAGE_KEY, qs)
      } catch {
        // private mode / quota
      }
      return
    }

    // Bare /corpus — restore last filters if any
    let saved = ''
    try {
      saved = sessionStorage.getItem(STORAGE_KEY) ?? ''
    } catch {
      saved = ''
    }
    if (saved && saved !== '?' && !current) {
      router.replace(`/corpus${saved.startsWith('?') ? saved : `?${saved}`}`)
    }
  }, [pathname, router, searchParams])

  return null
}

export function clearCorpusFiltersPersist(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function readCorpusFiltersHref(): string {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved && saved !== '?') {
      return `/corpus${saved.startsWith('?') ? saved : `?${saved}`}`
    }
  } catch {
    // ignore
  }
  return '/corpus'
}

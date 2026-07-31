'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

import { getArtworkViewportLayout, getSsrArtworkViewportLayout } from '@/helpers/artworkViewportLayout'
import {
  DEFAULT_ARTIST_INFO,
  type ArtistInfoData,
  type SortingType,
} from '@/types/frontend'

/** Persistent UI + slim lookup — lives in root layout across all routes. */
export type ArtworkChromeState = {
  currentArtworkIndex: number
  currentArtworkSlug: string | null
  sorting: SortingType
  artworkViewTimeline: boolean
  filtersArray: string[]
  isAvailableFilter: boolean
  filterNavOpen: boolean
  searchNavOpen: boolean
  showSlideshow: boolean
  slideshowPlaying: boolean
  slideshowIndex: number
  slideshowTimerProgress: number
  isTimelineScrollingProgamatically: boolean
  searchValue: string
  infoOpen: boolean
  artistData: ArtistInfoData
  viewportWidth: number
  viewportHeight: number
  artworkContainerWidth: number
  artworkContainerHeight: number
  artworkDesktopSideWidth: number
  savedTimelineIndex: number
  savedTimelineFiltersHash: string
  seriesSlugByArtworkSlug: Record<string, string>
  archiveMedianAreaMm2: number
}

type ArtworkChromeContextValue = {
  chrome: ArtworkChromeState
  setChrome: Dispatch<SetStateAction<ArtworkChromeState>>
}

const ArtworkChromeContext = createContext<ArtworkChromeContextValue | null>(null)

function createInitialChromeState(
  artist: ArtistInfoData,
  seriesSlugByArtworkSlug: Record<string, string>,
  archiveMedianAreaMm2: number,
): ArtworkChromeState {
  return {
    currentArtworkIndex: 0,
    currentArtworkSlug: null,
    sorting: 'latest',
    artworkViewTimeline: true,
    filtersArray: [],
    isAvailableFilter: false,
    filterNavOpen: false,
    searchNavOpen: false,
    showSlideshow: false,
    slideshowPlaying: false,
    slideshowIndex: 0,
    slideshowTimerProgress: 0,
    isTimelineScrollingProgamatically: false,
    searchValue: '',
    infoOpen: false,
    artistData: artist,
    ...getSsrArtworkViewportLayout(),
    savedTimelineIndex: 0,
    savedTimelineFiltersHash: '',
    seriesSlugByArtworkSlug,
    archiveMedianAreaMm2,
  }
}

interface ArtworkChromeProviderProps {
  children: ReactNode
  artist: ArtistInfoData | null
  seriesSlugByArtworkSlug: Record<string, string>
  archiveMedianAreaMm2: number
}

export function ArtworkChromeProvider({
  children,
  artist,
  seriesSlugByArtworkSlug,
  archiveMedianAreaMm2,
}: ArtworkChromeProviderProps) {
  const [chrome, setChrome] = useState<ArtworkChromeState>(() =>
    createInitialChromeState(
      artist ?? DEFAULT_ARTIST_INFO,
      seriesSlugByArtworkSlug,
      archiveMedianAreaMm2,
    ),
  )

  useEffect(() => {
    setChrome((prev) => ({
      ...prev,
      artistData: artist ?? DEFAULT_ARTIST_INFO,
      seriesSlugByArtworkSlug,
      archiveMedianAreaMm2,
    }))
  }, [artist, seriesSlugByArtworkSlug, archiveMedianAreaMm2])

  useEffect(() => {
    const applyViewportDimensions = () => {
      setChrome((prev) => ({
        ...prev,
        ...getArtworkViewportLayout(window.innerWidth, window.innerHeight),
      }))
    }

    applyViewportDimensions()
    window.addEventListener('resize', applyViewportDimensions)
    return () => window.removeEventListener('resize', applyViewportDimensions)
  }, [])

  const value = useMemo(() => ({ chrome, setChrome }), [chrome])

  return <ArtworkChromeContext.Provider value={value}>{children}</ArtworkChromeContext.Provider>
}

export function useArtworkChrome(): ArtworkChromeContextValue {
  const context = useContext(ArtworkChromeContext)
  if (!context) {
    throw new Error('useArtworkChrome must be used within ArtworkChromeProvider')
  }
  return context
}

'use client'

import {
  useEffect,
  useMemo,
  useRef,
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

import { artworkHasDisplayImage, resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { generateTimeline, getArtworkSortKey } from '@/helpers/timeline'
import { useArtworkChrome, type ArtworkChromeState } from '@/providers/ArtworkChromeProvider'
import {
  EMPTY_TIMELINE_MARKERS,
  type ArtworksContextType,
  type ArtworksState,
  type CatalogueArtwork,
  type FilterCategory,
  type TimelineMarkersData,
} from '@/types/frontend'

type CollectionSlice = {
  filterSeries: FilterCategory[]
  original: CatalogueArtwork[]
  filtered: CatalogueArtwork[]
  formattedArtworks: ArtworksState['formattedArtworks']
  searchMatches: Record<string, string[]>
  timelineMarkers: TimelineMarkersData
  totalCount: number
  withImagesCount: number
}

const EMPTY_COLLECTION: CollectionSlice = {
  filterSeries: [],
  original: [],
  filtered: [],
  formattedArtworks: null,
  searchMatches: {},
  timelineMarkers: EMPTY_TIMELINE_MARKERS,
  totalCount: 0,
  withImagesCount: 0,
}

const CollectionContext = createContext<CollectionSlice>(EMPTY_COLLECTION)

const CHROME_KEYS = new Set<keyof ArtworkChromeState>([
  'currentArtworkIndex',
  'currentArtworkSlug',
  'sorting',
  'artworkViewTimeline',
  'filtersArray',
  'isAvailableFilter',
  'filterNavOpen',
  'searchNavOpen',
  'showSlideshow',
  'slideshowPlaying',
  'slideshowIndex',
  'slideshowTimerProgress',
  'isTimelineScrollingProgamatically',
  'searchValue',
  'infoOpen',
  'artistData',
  'viewportWidth',
  'viewportHeight',
  'artworkContainerWidth',
  'artworkContainerHeight',
  'artworkDesktopSideWidth',
  'savedTimelineIndex',
  'savedTimelineFiltersHash',
  'seriesSlugByArtworkSlug',
  'archiveMedianAreaMm2',
])

function mergeState(chrome: ArtworkChromeState, collection: CollectionSlice): ArtworksState {
  return {
    ...chrome,
    filterSeries: collection.filterSeries,
    original: collection.original,
    filtered: collection.filtered,
    formattedArtworks: collection.formattedArtworks,
    searchMatches: collection.searchMatches,
    timelineMarkers: collection.timelineMarkers,
    totalCount: collection.totalCount,
    withImagesCount: collection.withImagesCount,
    cvData: [],
    bioData: null,
    statementData: null,
    contactData: null,
    datenschutzData: null,
  }
}

function pickChromeUpdates(
  next: ArtworksState,
  prevChrome: ArtworkChromeState,
): ArtworkChromeState {
  const updates: Partial<ArtworkChromeState> = {}
  let changed = false
  for (const key of CHROME_KEYS) {
    const nextValue = next[key as keyof ArtworksState]
    if (nextValue !== prevChrome[key]) {
      ;(updates as Record<string, unknown>)[key] = nextValue
      changed = true
    }
  }
  return changed ? { ...prevChrome, ...updates } : prevChrome
}

interface CollectionArtworksProviderProps {
  children: ReactNode
  artworks: CatalogueArtwork[]
  timelineMarkers: TimelineMarkersData
  filterSeries: FilterCategory[]
  /** Series pages pass `[slug]` so SSR filter chips match the scoped catalogue. */
  initialFiltersArray?: string[]
}

/**
 * Route-level catalogue for `/` and `/series/[slug]`.
 * Filter/sort/search/view state lives in ArtworkChromeProvider (root).
 */
export function CollectionArtworksProvider({
  children,
  artworks,
  timelineMarkers,
  filterSeries,
  initialFiltersArray,
}: CollectionArtworksProviderProps) {
  const { chrome, setChrome } = useArtworkChrome()
  const didInitFilters = useRef(false)

  useEffect(() => {
    if (!initialFiltersArray || didInitFilters.current) return
    didInitFilters.current = true
    setChrome((prev) => ({
      ...prev,
      filtersArray: initialFiltersArray,
      currentArtworkIndex: 0,
      savedTimelineIndex: 0,
      savedTimelineFiltersHash: '',
    }))
  }, [initialFiltersArray, setChrome])

  const catalogue = artworks ?? []
  const artworksWithImages = useMemo(
    () => catalogue.filter((artwork) => artworkHasDisplayImage(artwork)),
    [catalogue],
  )

  const filteredAndSorted = useMemo(() => {
    let result = artworksWithImages

    if (chrome.isAvailableFilter) {
      result = result.filter((artwork) => artwork.availabilityStatus === 'available')
    }

    if (chrome.filtersArray.length > 0) {
      result = result.filter((artwork) => {
        const seriesSlug = resolveSeriesSlug(artwork)
        return seriesSlug ? chrome.filtersArray.includes(seriesSlug) : false
      })
    }

    const query = chrome.searchValue.trim().toLowerCase()
    const searchMatches: Record<string, string[]> = {}

    if (query) {
      result = result.filter((artwork) => {
        const fields: Array<{ name: string; value: string }> = [
          { name: 'title', value: artwork.title ?? '' },
          { name: 'city', value: artwork.city ?? '' },
          { name: 'country', value: artwork.country ?? '' },
          { name: 'medium', value: artwork.medium ?? '' },
          { name: 'year', value: artwork.yearCreated ? String(artwork.yearCreated) : '' },
        ]

        const matchedFields = fields
          .filter((field) => field.value.toLowerCase().includes(query))
          .map((field) => field.name)

        const isMatch = matchedFields.length > 0
        if (isMatch) {
          searchMatches[String(artwork.id)] = matchedFields
        }
        return isMatch
      })
    }

    const sorted = [...result]
    if (chrome.sorting === 'latest') {
      sorted.sort((a, b) => getArtworkSortKey(b) - getArtworkSortKey(a))
    } else if (chrome.sorting === 'oldest') {
      sorted.sort((a, b) => getArtworkSortKey(a) - getArtworkSortKey(b))
    } else if (chrome.sorting === 'random') {
      sorted.sort(() => Math.random() - 0.5)
    }

    return { filtered: sorted, searchMatches }
  }, [
    artworksWithImages,
    chrome.isAvailableFilter,
    chrome.filtersArray,
    chrome.searchValue,
    chrome.sorting,
  ])

  const currentFiltersHash = useMemo(
    () =>
      JSON.stringify({
        filters: [...chrome.filtersArray].sort(),
        search: chrome.searchValue,
        sort: chrome.sorting,
      }),
    [chrome.filtersArray, chrome.searchValue, chrome.sorting],
  )

  useEffect(() => {
    setChrome((prev) => {
      if (!prev.savedTimelineFiltersHash) {
        return { ...prev, savedTimelineFiltersHash: currentFiltersHash }
      }
      if (prev.savedTimelineFiltersHash === currentFiltersHash) return prev
      return {
        ...prev,
        savedTimelineFiltersHash: currentFiltersHash,
        savedTimelineIndex: 0,
        currentArtworkIndex: 0,
      }
    })
  }, [currentFiltersHash, setChrome])

  const formattedArtworks = useMemo(() => {
    if (
      chrome.artworkContainerWidth <= 0 ||
      chrome.artworkContainerHeight <= 0 ||
      chrome.viewportWidth <= 0 ||
      chrome.viewportHeight <= 0 ||
      filteredAndSorted.filtered.length === 0
    ) {
      return null
    }

    return generateTimeline({
      artworks: filteredAndSorted.filtered,
      sorting: chrome.sorting,
      artworkContainerWidth: chrome.artworkContainerWidth,
      artworkContainerHeight: chrome.artworkContainerHeight,
      desktopSideWidth: chrome.artworkDesktopSideWidth,
      viewportWidth: chrome.viewportWidth,
      viewportHeight: chrome.viewportHeight,
    })
  }, [
    filteredAndSorted.filtered,
    chrome.sorting,
    chrome.artworkContainerWidth,
    chrome.artworkContainerHeight,
    chrome.artworkDesktopSideWidth,
    chrome.viewportWidth,
    chrome.viewportHeight,
  ])

  // Keep currentArtworkSlug in sync with timeline focus (menu colour Option A).
  useEffect(() => {
    const list = formattedArtworks?.artworksArray ?? filteredAndSorted.filtered
    if (list.length === 0) return
    const safeIndex = Math.min(Math.max(0, chrome.currentArtworkIndex), list.length - 1)
    const slug = list[safeIndex]?.slug?.trim() || null
    if (slug && slug !== chrome.currentArtworkSlug) {
      setChrome((prev) => ({ ...prev, currentArtworkSlug: slug }))
    }
  }, [
    chrome.currentArtworkIndex,
    chrome.currentArtworkSlug,
    filteredAndSorted.filtered,
    formattedArtworks,
    setChrome,
  ])

  const collection = useMemo<CollectionSlice>(
    () => ({
      filterSeries,
      original: artworksWithImages,
      filtered: filteredAndSorted.filtered,
      formattedArtworks,
      searchMatches: filteredAndSorted.searchMatches,
      timelineMarkers: timelineMarkers ?? EMPTY_TIMELINE_MARKERS,
      totalCount: catalogue.length,
      withImagesCount: artworksWithImages.length,
    }),
    [
      filterSeries,
      artworksWithImages,
      filteredAndSorted,
      formattedArtworks,
      timelineMarkers,
      catalogue.length,
    ],
  )

  return <CollectionContext.Provider value={collection}>{children}</CollectionContext.Provider>
}

/**
 * Merged chrome + collection API — same shape as the pre-Phase-5 provider.
 * Outside collection routes, catalogue fields are empty.
 */
export function useArtworks(): ArtworksContextType {
  const { chrome, setChrome } = useArtworkChrome()
  const collection = useContext(CollectionContext)
  const collectionRef = useRef(collection)
  collectionRef.current = collection

  const state = useMemo(() => mergeState(chrome, collection), [chrome, collection])

  const setState = useMemo<Dispatch<SetStateAction<ArtworksState>>>(() => {
    return (update) => {
      setChrome((prevChrome) => {
        const prevMerged = mergeState(prevChrome, collectionRef.current)
        const next = typeof update === 'function' ? update(prevMerged) : update
        return pickChromeUpdates(next, prevChrome)
      })
    }
  }, [setChrome])

  return [state, setState]
}

/** @deprecated Use CollectionArtworksProvider on collection routes; root uses ArtworkChromeProvider. */
export const ArtworksProvider = CollectionArtworksProvider

export default CollectionArtworksProvider

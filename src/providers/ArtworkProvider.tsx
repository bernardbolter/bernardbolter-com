'use client'

import { useEffect, useMemo, useState, createContext, useContext, type ReactNode } from 'react'

import { artworkHasDisplayImage, resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { generateTimeline } from '@/helpers/timeline'
import {
  DEFAULT_ARTIST_INFO,
  createInitialArtworksState,
  type ArtistInfoData,
  type ArtworksContextType,
  type ArtworksState,
  type CatalogueArtwork,
} from '@/types/frontend'

const ArtworksContext = createContext<ArtworksContextType>([createInitialArtworksState([]), () => {}])

interface ArtworksProviderProps {
  children: ReactNode
  artworks: CatalogueArtwork[]
  artist: ArtistInfoData | null
}

export const ArtworksProvider = ({ children, artworks, artist }: ArtworksProviderProps) => {
  const catalogue = artworks ?? []
  const artworksWithImages = useMemo(
    () => catalogue.filter((artwork) => artworkHasDisplayImage(artwork)),
    [catalogue],
  )

  const [state, setState] = useState<ArtworksState>(() => ({
    ...createInitialArtworksState(artworksWithImages, artist ?? DEFAULT_ARTIST_INFO),
    totalCount: catalogue.length,
    withImagesCount: artworksWithImages.length,
  }))

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      original: artworksWithImages,
      filtered: artworksWithImages,
      artistData: artist ?? DEFAULT_ARTIST_INFO,
      totalCount: catalogue.length,
      withImagesCount: artworksWithImages.length,
    }))
  }, [artist, artworksWithImages, catalogue.length])

  // Keep viewport and artwork container sizing in provider state.
  useEffect(() => {
    const applyViewportDimensions = () => {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const isDesktop = viewportWidth >= 768
      const artworkContainerSize = isDesktop
        ? Math.max(1, viewportHeight - 125)
        : Math.max(1, viewportWidth - 50)
      const artworkDesktopSideWidth = isDesktop
        ? Math.max(0, (viewportWidth - artworkContainerSize) / 2)
        : 0

      setState((prev) => ({
        ...prev,
        viewportWidth,
        viewportHeight,
        artworkContainerWidth: artworkContainerSize,
        artworkContainerHeight: artworkContainerSize,
        artworkDesktopSideWidth,
      }))
    }

    applyViewportDimensions()
    window.addEventListener('resize', applyViewportDimensions)
    return () => window.removeEventListener('resize', applyViewportDimensions)
  }, [])

  const filteredAndSorted = useMemo(() => {
    let result = state.original

    if (state.isAvailableFilter) {
      result = result.filter((artwork) => artwork.availabilityStatus === 'available')
    }

    if (state.filtersArray.length > 0) {
      result = result.filter((artwork) => {
        const seriesSlug = resolveSeriesSlug(artwork)
        return seriesSlug ? state.filtersArray.includes(seriesSlug) : false
      })
    }

    const query = state.searchValue.trim().toLowerCase()
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
    if (state.sorting === 'latest') {
      sorted.sort((a, b) => {
        const aKey = typeof a.sortIndex === 'number' ? a.sortIndex : Number.NEGATIVE_INFINITY
        const bKey = typeof b.sortIndex === 'number' ? b.sortIndex : Number.NEGATIVE_INFINITY
        return bKey - aKey
      })
    } else if (state.sorting === 'oldest') {
      sorted.sort((a, b) => {
        const aKey = typeof a.sortIndex === 'number' ? a.sortIndex : Number.POSITIVE_INFINITY
        const bKey = typeof b.sortIndex === 'number' ? b.sortIndex : Number.POSITIVE_INFINITY
        return aKey - bKey
      })
    } else if (state.sorting === 'random') {
      sorted.sort(() => Math.random() - 0.5)
    }

    return { filtered: sorted, searchMatches }
  }, [state.original, state.isAvailableFilter, state.filtersArray, state.searchValue, state.sorting])

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      filtered: filteredAndSorted.filtered,
      searchMatches: filteredAndSorted.searchMatches,
    }))
  }, [filteredAndSorted])

  const currentFiltersHash = useMemo(
    () =>
      JSON.stringify({
        filters: [...state.filtersArray].sort(),
        search: state.searchValue,
        sort: state.sorting,
      }),
    [state.filtersArray, state.searchValue, state.sorting],
  )

  useEffect(() => {
    setState((prev) => {
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
  }, [currentFiltersHash])

  const formattedArtworks = useMemo(() => {
    if (
      state.artworkContainerWidth <= 0 ||
      state.artworkContainerHeight <= 0 ||
      state.viewportWidth <= 0 ||
      state.viewportHeight <= 0 ||
      state.filtered.length === 0
    ) {
      return null
    }

    return generateTimeline({
      artworks: state.filtered,
      sorting: state.sorting,
      artworkContainerWidth: state.artworkContainerWidth,
      artworkContainerHeight: state.artworkContainerHeight,
      desktopSideWidth: state.artworkDesktopSideWidth,
      viewportWidth: state.viewportWidth,
      viewportHeight: state.viewportHeight,
    })
  }, [
    state.filtered,
    state.sorting,
    state.artworkContainerWidth,
    state.artworkContainerHeight,
    state.artworkDesktopSideWidth,
    state.viewportWidth,
    state.viewportHeight,
  ])

  useEffect(() => {
    setState((prev) => ({ ...prev, formattedArtworks }))
  }, [formattedArtworks])

  return <ArtworksContext.Provider value={[state, setState]}>{children}</ArtworksContext.Provider>
}

export function useArtworks() {
  const context = useContext(ArtworksContext)
  if (!context) {
    throw new Error('useArtworks must be used within ArtworksProvider')
  }
  return context
}

export default ArtworksProvider

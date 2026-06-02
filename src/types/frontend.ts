import type { Dispatch, SetStateAction } from 'react'

import type { Artwork, Artist, Event, Media } from '@/payload-types'
import type { SortingType, TimelineResult } from '@/types/timlineTypes'

export type { Artwork, Artist, Event, Media }
export type { SortingType } from '@/types/timlineTypes'

/** Published catalogue artwork as returned by `getArtworks()` (depth 2). */
export type CatalogueArtwork = Artwork

export type ArtworkSizeTier = NonNullable<Artwork['sizeTier']>

export interface FilterCategory {
  id: string
  slug: string
  name: string
  color: string
}

export interface SortOption {
  id: string
  slug: SortingType
  name: string
}

export interface ArtistInfoLink {
  title?: string
  url?: string
  target?: string
}

/** Subset of Artist global used by Info panel (Payload field names). */
export interface ArtistInfoData {
  name?: string | null
  birthCity?: string | null
  birthYear?: number | null
  workCity1?: string | null
  workCity2?: string | null
  workCity3?: string | null
  link1?: ArtistInfoLink | null
  link2?: ArtistInfoLink | null
  link3?: ArtistInfoLink | null
  link4?: ArtistInfoLink | null
  link5?: ArtistInfoLink | null
}

export interface ArtworksState {
  original: CatalogueArtwork[]
  filtered: CatalogueArtwork[]
  formattedArtworks: TimelineResult | null
  currentArtworkIndex: number
  sorting: SortingType
  artworkViewTimeline: boolean
  filtersArray: string[]
  isAvailableFilter: boolean
  filterNavOpen: boolean
  searchNavOpen: boolean
  searchMatches: Record<string, string[]>
  showSlideshow: boolean
  slideshowPlaying: boolean
  slideshowIndex: number
  slideshowTimerProgress: number
  isTimelineScrollingProgamatically: boolean
  searchValue: string
  infoOpen: boolean
  cvData: Event[]
  artistData: ArtistInfoData
  bioData: { content?: string } | null
  statementData: { content?: string } | null
  contactData: { content?: string } | null
  datenschutzData: { content?: string } | null
  viewportWidth: number
  viewportHeight: number
  artworkContainerWidth: number
  artworkContainerHeight: number
  artworkDesktopSideWidth: number
  savedTimelineIndex: number
  savedTimelineFiltersHash: string
  totalCount: number
  withImagesCount: number
}

export type ArtworksContextType = [ArtworksState, Dispatch<SetStateAction<ArtworksState>>]

export const DEFAULT_ARTIST_INFO: ArtistInfoData = {}

export function createInitialArtworksState(
  artworks: CatalogueArtwork[],
  artist: ArtistInfoData = DEFAULT_ARTIST_INFO,
): ArtworksState {
  return {
    original: artworks,
    filtered: artworks,
    formattedArtworks: null,
    currentArtworkIndex: 0,
    sorting: 'latest',
    artworkViewTimeline: true,
    filtersArray: [],
    isAvailableFilter: false,
    filterNavOpen: false,
    searchNavOpen: false,
    searchMatches: {},
    showSlideshow: false,
    slideshowPlaying: false,
    slideshowIndex: 0,
    slideshowTimerProgress: 0,
    isTimelineScrollingProgamatically: false,
    searchValue: '',
    infoOpen: false,
    cvData: [],
    artistData: artist,
    bioData: null,
    statementData: null,
    contactData: null,
    datenschutzData: null,
    viewportWidth: 0,
    viewportHeight: 0,
    artworkContainerWidth: 0,
    artworkContainerHeight: 0,
    artworkDesktopSideWidth: 0,
    savedTimelineIndex: 0,
    savedTimelineFiltersHash: '',
    totalCount: artworks.length,
    withImagesCount: artworks.length,
  }
}

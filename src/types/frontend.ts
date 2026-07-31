import type { Dispatch, SetStateAction } from 'react'

import { getSsrArtworkViewportLayout } from '@/helpers/artworkViewportLayout'
import { generateTimeline } from '@/helpers/timeline'
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
  label: string
  url: string
}

/** Subset of Artist global used by Info panel (Payload field names). */
export interface ArtistSocialLinks {
  instagram?: string | null
  tiktok?: string | null
  youtube?: string | null
  linkedin?: string | null
}

export interface ArtistInfoData {
  name?: string | null
  birthCity?: string | null
  birthYear?: number | null
  workCity1?: string | null
  workCity2?: string | null
  workCity3?: string | null
  websiteLinks?: ArtistInfoLink[]
  socialLinks?: ArtistSocialLinks
}

export type TimelineBioEntryMarker = {
  id: string
  eventDate: string
  year: number | null
  text: string
  permalinkHref: string | null
  sourceSessionHref: string | null
  linkedArtworkIds: number[]
}

export type TimelineThroughlineMarker = {
  id: string
  text: string
  permalinkHref: string | null
  linkedArtworkIds: number[]
}

export type TimelineHistoricalReadingMarker = {
  id: string
  date: string
  year: number | null
  type: 'bio' | 'statement'
  href: string
}

export interface TimelineMarkersData {
  bioEntries: TimelineBioEntryMarker[]
  throughlines: TimelineThroughlineMarker[]
  historicalReadings: TimelineHistoricalReadingMarker[]
}

export interface ArtworksState {
  filterSeries: FilterCategory[]
  original: CatalogueArtwork[]
  filtered: CatalogueArtwork[]
  formattedArtworks: TimelineResult | null
  currentArtworkIndex: number
  /** Artwork slug for the timeline/grid focus — drives menu colour via slim map (Option A). */
  currentArtworkSlug: string | null
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
  timelineMarkers: TimelineMarkersData
  viewportWidth: number
  viewportHeight: number
  artworkContainerWidth: number
  artworkContainerHeight: number
  artworkDesktopSideWidth: number
  savedTimelineIndex: number
  savedTimelineFiltersHash: string
  totalCount: number
  withImagesCount: number
  /** Practice-wide grid scale anchor (mm²). */
  archiveMedianAreaMm2: number
}

export type ArtworksContextType = [ArtworksState, Dispatch<SetStateAction<ArtworksState>>]

export const DEFAULT_ARTIST_INFO: ArtistInfoData = {}
export const EMPTY_TIMELINE_MARKERS: TimelineMarkersData = {
  bioEntries: [],
  throughlines: [],
  historicalReadings: [],
}

export type CreateInitialArtworksStateOptions = {
  /** Pre-select series filter chips (e.g. `/series/[slug]` SSR). */
  filtersArray?: string[]
  archiveMedianAreaMm2?: number
}

export function createInitialArtworksState(
  artworks: CatalogueArtwork[],
  artist: ArtistInfoData = DEFAULT_ARTIST_INFO,
  timelineMarkers: TimelineMarkersData = EMPTY_TIMELINE_MARKERS,
  filterSeries: FilterCategory[] = [],
  options: CreateInitialArtworksStateOptions = {},
): ArtworksState {
  const sorting: SortingType = 'latest'
  const viewport = getSsrArtworkViewportLayout()
  const filtersArray = options.filtersArray ?? []
  const formattedArtworks =
    artworks.length > 0
      ? generateTimeline({
          artworks,
          sorting,
          artworkContainerWidth: viewport.artworkContainerWidth,
          artworkContainerHeight: viewport.artworkContainerHeight,
          desktopSideWidth: viewport.artworkDesktopSideWidth,
          viewportWidth: viewport.viewportWidth,
          viewportHeight: viewport.viewportHeight,
        })
      : null

  return {
    filterSeries,
    original: artworks,
    filtered: artworks,
    formattedArtworks,
    currentArtworkIndex: 0,
    currentArtworkSlug: artworks[0]?.slug?.trim() || null,
    sorting,
    artworkViewTimeline: true,
    filtersArray,
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
    timelineMarkers,
    ...viewport,
    savedTimelineIndex: 0,
    savedTimelineFiltersHash: '',
    totalCount: artworks.length,
    withImagesCount: artworks.length,
    archiveMedianAreaMm2: options.archiveMedianAreaMm2 ?? 0,
  }
}

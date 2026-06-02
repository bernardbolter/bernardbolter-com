import type { Artwork } from '@/payload-types'

export type SortingType = 'latest' | 'oldest' | 'random'

export interface TimelineArtwork extends Artwork {
  originalIndex: number
  marginRight: number
  marginBottom: number
  horizontalScrollPoint: number
  verticalScrollPoint: number
}

export interface TimelineTimepoint {
  id: string
  year: number
  type: 'artwork-year' | 'missing-year'
  distanceFromStart: number
  isVisible: boolean
}

export interface TimeSpanInfo {
  startDate: Date
  endDate: Date
  totalTimeSpan: number
  totalYears: number
}

export interface TimelineResult {
  artworksArray: TimelineArtwork[]
  timepointsArray: TimelineTimepoint[]
  totalTimelineWidth: number
  totalTimelineHeight: number
  timeSpanInfo: TimeSpanInfo | null
}

export interface TimelineConfig {
  artworks: Artwork[]
  sorting: SortingType
  artworkContainerWidth: number
  artworkContainerHeight: number
  desktopSideWidth: number
  viewportWidth: number
  viewportHeight: number
  pixelsPerYear?: number
}

export interface GenerateSmallLinesProps {
  isMobile: boolean
  totalTimelineHeight: number
  totalTimelineWidth: number
  artworkContainerHeight: number
  artworkContainerWidth: number
  artworkDesktopSideWidth: number
  targetSpacing?: number
}

// Provider state extensions
export interface TimelineState {
  sorting: SortingType
  artworkViewTimeline: boolean
  isTimelineScrollingProgamatically: boolean
  savedTimelineIndex: number
  savedTimelineFiltersHash: string
  currentArtworkIndex: number
  formattedArtworks: TimelineResult | null
  viewportWidth: number
  viewportHeight: number
  artworkContainerWidth: number
  artworkContainerHeight: number
  artworkDesktopSideWidth: number
}

import { JSX } from 'react'
import type { Artwork } from '@/payload-types'

import type {
  TimelineArtwork,
  TimelineTimepoint,
  GenerateSmallLinesProps,
  TimelineConfig,
  TimelineResult,
} from '@/types/timlineTypes'

// Constants
const MILLISECONDS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000
const MILLISECONDS_PER_MONTH = MILLISECONDS_PER_YEAR / 12
const DEFAULT_PIXELS_PER_YEAR = 120
const PIXELS_PER_MONTH = 10

// Safe date getter for timeline layout — prefers computed timelineDate, never used as public label.
export function getArtworkDate(artwork: {
  sortIndex?: number | null
  timelineDate?: string | Date | null
  yearCreated?: number | null
  dateCreated?: string | Date | null
  date?: string | Date | null
  createdAt?: string | Date
}): Date {
  const timelineValue = artwork.timelineDate
  if (timelineValue) {
    try {
      const d = new Date(timelineValue)
      if (!Number.isNaN(d.getTime())) return d
    } catch {
      // fall through
    }
  }
  if (typeof artwork.yearCreated === 'number' && !Number.isNaN(artwork.yearCreated)) {
    return new Date(artwork.yearCreated, 0, 1)
  }
  const dateValue = artwork.dateCreated || artwork.date || artwork.createdAt
  if (!dateValue) return new Date('2000-01-01')

  try {
    const d = new Date(dateValue)
    if (isNaN(d.getTime())) return new Date('2000-01-01')
    return d
  } catch {
    return new Date('2000-01-01')
  }
}

/** Authoritative sort key: sortIndex, then layout date, then yearCreated. */
export function getArtworkSortKey(artwork: {
  sortIndex?: number | null
  timelineDate?: string | Date | null
  yearCreated?: number | null
  dateCreated?: string | Date | null
  date?: string | Date | null
  createdAt?: string | Date
}): number {
  if (typeof artwork.sortIndex === 'number' && !Number.isNaN(artwork.sortIndex)) {
    return artwork.sortIndex
  }
  return getArtworkDate(artwork).getTime()
}

/** Human label for the timeline — never expose timelineDate. */
export function getArtworkDisplayLabel(artwork: {
  dateDisplay?: string | null
  yearCreated?: number | null
}): string {
  if (artwork.dateDisplay?.trim()) return artwork.dateDisplay.trim()
  if (typeof artwork.yearCreated === 'number' && !Number.isNaN(artwork.yearCreated)) {
    return String(artwork.yearCreated)
  }
  return ''
}

// Helper function to shuffle array for random sorting
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Main function to generate timeline data with separated arrays
 */
export function generateTimeline(config: TimelineConfig): TimelineResult {
  const {
    artworks,
    sorting,
    artworkContainerWidth,
    artworkContainerHeight,
    desktopSideWidth,
    viewportWidth,
    viewportHeight,
    pixelsPerYear = DEFAULT_PIXELS_PER_YEAR,
  } = config

  if (artworks.length === 0) {
    return {
      artworksArray: [],
      timepointsArray: [],
      totalTimelineWidth: 0,
      totalTimelineHeight: 0,
      timeSpanInfo: null,
    }
  }

  // Step 1: Prepare artworks with original indices
  const indexedArtworks = artworks.map((artwork, index) => ({
    ...artwork,
    originalIndex: index,
  }))

  // Step 2: Sort based on sorting type
  let sortedArtworks: (Artwork & { originalIndex: number })[]

  switch (sorting) {
    case 'latest':
      sortedArtworks = [...indexedArtworks].sort((a, b) => {
        return getArtworkSortKey(b) - getArtworkSortKey(a)
      })
      break
    case 'oldest':
      sortedArtworks = [...indexedArtworks].sort((a, b) => {
        return getArtworkSortKey(a) - getArtworkSortKey(b)
      })
      break
    case 'random':
      sortedArtworks = shuffleArray(indexedArtworks)
      break
    default:
      sortedArtworks = indexedArtworks
  }

  // Step 3: Generate artworks array and timepoints array
  const artworksArray: TimelineArtwork[] = []
  const timepointsArray: TimelineTimepoint[] = []

  if (sorting === 'random') {
    // For random: no margins, but with timepoints
    let currentDistanceFromStart = artworkContainerWidth / 2 // Center of first artwork

    sortedArtworks.forEach((artwork, index) => {
      const currentDate = getArtworkDate(artwork)
      const currentYear = currentDate.getFullYear()

      artworksArray.push({
        ...artwork,
        marginRight: 0,
        marginBottom: 0,
        horizontalScrollPoint: 0,
        verticalScrollPoint: 0,
      })

      const artworkCenterDistance = currentDistanceFromStart

      timepointsArray.push({
        id: `artwork-year-${currentYear}-${index}`,
        year: currentYear,
        type: 'artwork-year',
        distanceFromStart: artworkCenterDistance,
        isVisible: true,
      })
      currentDistanceFromStart += artworkContainerWidth // Move to start of next artwork
    })
  } else {
    const seenYears = new Set<number>() // Track seen years
    // For latest/oldest: calculate margins and create timepoints
    let currentDistanceFromStart = artworkContainerWidth / 2 // Start at center of first artwork

    sortedArtworks.forEach((artwork, index) => {
      const currentDate = getArtworkDate(artwork)
      const currentYear = currentDate.getFullYear()
      let marginRight = 0
      let marginBottom = 0
      const missingYears: number[] = []

      // Calculate margin based on time difference to next artwork
      if (index < sortedArtworks.length - 1) {
        const nextArtwork = sortedArtworks[index + 1]
        const nextDate = getArtworkDate(nextArtwork)
        const nextYear = nextDate.getFullYear()

        // Calculate time difference in months
        let timeDifferenceMs: number
        if (sorting === 'latest') {
          // For latest (newest first): current date should be newer than next date
          timeDifferenceMs = currentDate.getTime() - nextDate.getTime()
        } else {
          // For oldest (oldest first): next date should be newer than current date
          timeDifferenceMs = nextDate.getTime() - currentDate.getTime()
        }

        const timeDifferenceMonths = Math.abs(timeDifferenceMs) / MILLISECONDS_PER_MONTH

        // Calculate margin: 10px per month
        marginRight = Math.round(timeDifferenceMonths * PIXELS_PER_MONTH)
        marginBottom = Math.round(timeDifferenceMonths * PIXELS_PER_MONTH)

        // Generate missing years for timepoints (only for full year gaps)
        if (sorting === 'latest') {
          // For latest (newest first): check if next year is smaller (going backwards in time)
          if (currentYear - nextYear > 1) {
            // Generate missing years counting down
            for (let year = currentYear - 1; year > nextYear; year--) {
              missingYears.push(year)
            }
          }
        } else if (sorting === 'oldest') {
          // For oldest (oldest first): check if next year is bigger (going forwards in time)
          if (nextYear - currentYear > 1) {
            // Generate missing years counting up
            for (let year = currentYear + 1; year < nextYear; year++) {
              missingYears.push(year)
            }
          }
        }
      }

      // Add artwork to artworks array
      artworksArray.push({
        ...artwork,
        marginRight,
        marginBottom,
        horizontalScrollPoint: 0, // Will be calculated later
        verticalScrollPoint: 0, // Will be calculated later
      })

      // Check if this is the first artwork of the year
      const isFirstArtworkOfYear = !seenYears.has(currentYear)
      seenYears.add(currentYear)

      // Add artwork year timepoint (positioned at center of artwork)
      const artworkCenterDistance = currentDistanceFromStart
      timepointsArray.push({
        id: `artwork-year-${currentYear}-${index}`,
        year: currentYear,
        type: 'artwork-year',
        distanceFromStart: artworkCenterDistance,
        isVisible: index === sortedArtworks.length - 1 || isFirstArtworkOfYear, // Only show first artwork of year or last artwork
      })

      // Update position for missing years and next artwork
      currentDistanceFromStart += artworkContainerWidth / 2 // Move to end of current artwork

      // Add missing years timepoints (each 120px apart)
      missingYears.forEach((year, yearIndex) => {
        const missingYearDistance = currentDistanceFromStart + (yearIndex + 1) * pixelsPerYear
        timepointsArray.push({
          id: `missing-year-${year}`,
          year: year,
          type: 'missing-year',
          distanceFromStart: missingYearDistance,
          isVisible: true,
        })
      })

      // Update position for next artwork (move to start of next artwork, then we'll add half width to get to center)
      currentDistanceFromStart += marginRight + artworkContainerWidth / 2
    })
  }

  // Step 4: Calculate scroll points for artworks
  let currentHorizontalPosition = desktopSideWidth
  let currentVerticalPosition = 0

  artworksArray.forEach((artwork) => {
    // Calculate horizontal scroll point (center of artwork)
    const artworkHorizontalCenter = currentHorizontalPosition + artworkContainerWidth / 2
    artwork.horizontalScrollPoint = Math.max(0, artworkHorizontalCenter - viewportWidth / 2)

    // Calculate vertical scroll point (center of artwork)
    const artworkVerticalCenter = currentVerticalPosition + artworkContainerHeight / 2
    artwork.verticalScrollPoint = Math.max(0, artworkVerticalCenter - viewportHeight / 2)

    // Update positions for next artwork
    currentHorizontalPosition += artworkContainerWidth + artwork.marginRight
    currentVerticalPosition += artworkContainerHeight + artwork.marginBottom
  })

  // Step 5: Calculate total timeline dimensions
  const totalArtworkWidth = artworksArray.reduce(
    (total, artwork) => total + artworkContainerWidth + artwork.marginRight,
    0,
  )
  const totalArtworkHeight = artworksArray.reduce(
    (total, artwork) => total + artworkContainerHeight + artwork.marginBottom,
    0,
  )

  // Remove the last artwork's margin since it's not needed at the end
  const lastArtworkMarginRight =
    artworksArray.length > 0 ? artworksArray[artworksArray.length - 1].marginRight : 0
  const lastArtworkMarginBottom =
    artworksArray.length > 0 ? artworksArray[artworksArray.length - 1].marginBottom : 0

  const totalTimelineWidth =
    desktopSideWidth +
    artworkContainerWidth / 2 +
    totalArtworkWidth -
    lastArtworkMarginRight +
    desktopSideWidth -
    artworkContainerWidth / 2
  const totalTimelineHeight = totalArtworkHeight - lastArtworkMarginBottom

  // Step 6: Calculate time span info
  let timeSpanInfo = null

  if (artworksArray.length > 0) {
    const dates = artworksArray.map((artwork) => getArtworkDate(artwork))
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime())
    const startDate = sortedDates[0]
    const endDate = sortedDates[sortedDates.length - 1]
    const totalTimeSpan = endDate.getTime() - startDate.getTime()
    const totalYears = totalTimeSpan / MILLISECONDS_PER_YEAR

    timeSpanInfo = {
      startDate,
      endDate,
      totalTimeSpan,
      totalYears: Math.round(totalYears * 100) / 100,
    }
  }

  return {
    artworksArray,
    timepointsArray,
    totalTimelineWidth,
    totalTimelineHeight,
    timeSpanInfo,
  }
}

// Helper function to get all unique years from timepoints (useful for rendering)
export function getUniqueYears(timepoints: TimelineTimepoint[]): number[] {
  const years = new Set<number>()
  timepoints.forEach((tp) => years.add(tp.year))
  return Array.from(years).sort((a, b) => a - b)
}

// Helper function to get timepoints by type
export function getTimepointsByType(
  timepoints: TimelineTimepoint[],
  type: 'artwork-year' | 'missing-year',
): TimelineTimepoint[] {
  return timepoints.filter((tp) => tp.type === type)
}

// Helper function to get visible timepoints only
export function getVisibleTimepoints(timepoints: TimelineTimepoint[]): TimelineTimepoint[] {
  return timepoints.filter((tp) => tp.isVisible)
}

export const generateSmallLines = ({
  isMobile,
  totalTimelineHeight,
  totalTimelineWidth,
  artworkContainerHeight,
  artworkContainerWidth,
  artworkDesktopSideWidth,
  targetSpacing = 10,
}: GenerateSmallLinesProps): JSX.Element[] => {
  const totalDimension = isMobile
    ? totalTimelineHeight - artworkContainerHeight
    : totalTimelineWidth - artworkContainerWidth - artworkDesktopSideWidth * 2

  // Calculate optimal spacing closest to target spacing
  const numberOfLines = Math.floor(totalDimension / targetSpacing)
  const actualSpacing = totalDimension / numberOfLines

  const lines: JSX.Element[] = []

  for (let i = 0; i <= numberOfLines; i++) {
    const position = i * actualSpacing

    // Skip lines that would be too close to the start or end
    if (position < 5 || position > totalDimension - 5) continue

    // Create different sizes for visual hierarchy
    const isLargeTick = i % 10 === 0 // Every 10th line is larger
    const isMediumTick = i % 5 === 0 && !isLargeTick // Every 5th line is medium

    let lineSize: { width: string; height: string }
    let lineOpacity: number

    if (isLargeTick) {
      lineSize = isMobile ? { width: '14px', height: '1px' } : { width: '1px', height: '14px' }
      lineOpacity = 0.8
    } else if (isMediumTick) {
      lineSize = isMobile ? { width: '12px', height: '1px' } : { width: '1px', height: '12px' }
      lineOpacity = 0.7
    } else {
      lineSize = isMobile ? { width: '8px', height: '1px' } : { width: '1px', height: '8px' }
      lineOpacity = 0.5
    }

    const lineStyle: React.CSSProperties = isMobile
      ? {
          top: `${position}px`,
          ...lineSize,
          opacity: lineOpacity,
        }
      : {
          left: `${position}px`,
          ...lineSize,
          opacity: lineOpacity,
        }

    lines.push(
      <div key={`small-line-${i}`} className="artworks-timeline__small-line" style={lineStyle} />,
    )
  }

  return lines
}

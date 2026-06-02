import type { Artwork } from '@/payload-types'
import { getArtworkDate } from '@/helpers/timeline'

interface ArtworkWithTimeMargin extends Artwork {
  timeDifference: number
  timeMargin: number
}

const MILLISECONDS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000
const TARGET_PIXELS_PER_MONTH = 3
const MIN_MARGIN = 0
const MAX_MARGIN = 500

export const calculateTimeMargin = (
  timeDifference: number,
  totalTimeSpan: number,
  availableWidth?: number,
): number => {
  if (timeDifference <= 0) return 0

  const monthsDifference = timeDifference / MILLISECONDS_PER_MONTH
  let margin = monthsDifference * TARGET_PIXELS_PER_MONTH

  if (availableWidth && totalTimeSpan > 0) {
    const totalMonths = totalTimeSpan / MILLISECONDS_PER_MONTH
    const idealTotalMargin = totalMonths * TARGET_PIXELS_PER_MONTH

    if (idealTotalMargin > availableWidth * 0.5) {
      const scalingFactor = (availableWidth * 0.5) / idealTotalMargin
      margin = margin * scalingFactor
    }
  }

  return Math.max(MIN_MARGIN, Math.min(MAX_MARGIN, Math.round(margin)))
}

export const formatFilteredArtworkWithTimeMargin = (
  artworks: Artwork[],
  availableWidth?: number,
): ArtworkWithTimeMargin[] => {
  if (artworks.length === 0) return []

  const indexedArtworks = artworks.map((artwork, index) => ({
    ...artwork,
    originalIndex: index,
  }))

  const sortedArtworks = [...indexedArtworks].sort((a, b) => {
    return getArtworkDate(a).getTime() - getArtworkDate(b).getTime()
  })

  const totalTimeSpan =
    sortedArtworks.length > 1
      ? getArtworkDate(sortedArtworks[sortedArtworks.length - 1]).getTime() -
        getArtworkDate(sortedArtworks[0]).getTime()
      : 0

  const sortedWithTimeMargin = sortedArtworks.map((artwork, index) => {
    let timeDifference = 0
    let timeMargin = 0

    if (index > 0) {
      const currentDate = getArtworkDate(artwork)
      const previousDate = getArtworkDate(sortedArtworks[index - 1])
      timeDifference = currentDate.getTime() - previousDate.getTime()
      timeMargin = calculateTimeMargin(timeDifference, totalTimeSpan, availableWidth)
    }

    return {
      ...artwork,
      timeDifference,
      timeMargin,
    }
  })

  const result: ArtworkWithTimeMargin[] = new Array(artworks.length)
  sortedWithTimeMargin.forEach((artwork) => {
    const { originalIndex, ...artworkWithoutIndex } = artwork as typeof artwork & {
      originalIndex: number
    }
    result[originalIndex] = artworkWithoutIndex
  })

  return result
}

export const getTotalTimeMargin = (artworks: ArtworkWithTimeMargin[]): number => {
  return artworks.reduce((total, artwork) => total + artwork.timeMargin, 0)
}

export const getTimeSpanInfo = (artworks: Artwork[]) => {
  if (artworks.length === 0) return null

  const sortedArtworks = [...artworks].sort(
    (a, b) => getArtworkDate(a).getTime() - getArtworkDate(b).getTime(),
  )

  const startDate = getArtworkDate(sortedArtworks[0])
  const endDate = getArtworkDate(sortedArtworks[sortedArtworks.length - 1])
  const totalTimeSpan = endDate.getTime() - startDate.getTime()
  const totalMonths = totalTimeSpan / MILLISECONDS_PER_MONTH

  return {
    startDate,
    endDate,
    totalTimeSpan,
    totalMonths: Math.round(totalMonths * 100) / 100,
  }
}

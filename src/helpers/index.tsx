import { Artwork } from "@/types/artworkTypes";

// Extended artwork interface with time difference and calculated margin
interface ArtworkWithTimeMargin extends Artwork {
  timeDifference: number; // Time difference in milliseconds from previous artwork
  timeMargin: number; // Calculated margin in pixels based on time difference
}

// Constants for time calculations
const MILLISECONDS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000; // Average month in milliseconds
const TARGET_PIXELS_PER_MONTH = 3; // Target: 1px per month
const MIN_MARGIN = 0; // Minimum margin in pixels
const MAX_MARGIN = 500; // Maximum margin in pixels to prevent excessive spacing

/**
 * Calculate margin based on time difference to achieve ~1px per month spacing
 * @param timeDifference - Time difference in milliseconds
 * @param totalTimeSpan - Total time span of all artworks in milliseconds
 * @param availableWidth - Available width for margins (optional, for scaling)
 * @returns Calculated margin in pixels
 */
export const calculateTimeMargin = (
  timeDifference: number, 
  totalTimeSpan: number, 
  availableWidth?: number
): number => {
  if (timeDifference <= 0) return 0;
  
  // Calculate months difference
  const monthsDifference = timeDifference / MILLISECONDS_PER_MONTH;
  
  // Base calculation: 1px per month
  let margin = monthsDifference * TARGET_PIXELS_PER_MONTH;
  
  // Optional: Scale based on available width
  if (availableWidth && totalTimeSpan > 0) {
    const totalMonths = totalTimeSpan / MILLISECONDS_PER_MONTH;
    const idealTotalMargin = totalMonths * TARGET_PIXELS_PER_MONTH;
    
    // If ideal total margin exceeds available width, scale down proportionally
    if (idealTotalMargin > availableWidth * 0.5) { // Use max 50% of available width for margins
      const scalingFactor = (availableWidth * 0.5) / idealTotalMargin;
      margin = margin * scalingFactor;
    }
  }
  
  // Apply min/max constraints
  return Math.max(MIN_MARGIN, Math.min(MAX_MARGIN, Math.round(margin)));
};

/**
 * Enhanced version of your formatFilteredArtworkWithTimeDIff function
 * that also calculates time-based margins
 */
export const formatFilteredArtworkWithTimeMargin = (
  artworks: Artwork[], 
  availableWidth?: number
): ArtworkWithTimeMargin[] => {
  if (artworks.length === 0) return [];

  // Create a copy with indices to preserve original order
  const indexedArtworks = artworks.map((artwork, index) => ({
    ...artwork,
    originalIndex: index
  }));

  // Sort by date for time difference calculation
  const sortedArtworks = [...indexedArtworks].sort((a, b) => {
    const dateA = normalizeDate(a.date);
    const dateB = normalizeDate(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  // Calculate total time span
  const totalTimeSpan = sortedArtworks.length > 1 
    ? normalizeDate(sortedArtworks[sortedArtworks.length - 1].date).getTime() - 
      normalizeDate(sortedArtworks[0].date).getTime()
    : 0;

  // Calculate time differences and margins on sorted array
  const sortedWithTimeMargin = sortedArtworks.map((artwork, index) => {
    let timeDifference = 0;
    let timeMargin = 0;
    
    if (index > 0) {
      const currentDate = normalizeDate(artwork.date);
      const previousDate = normalizeDate(sortedArtworks[index - 1].date);
      timeDifference = currentDate.getTime() - previousDate.getTime();
      timeMargin = calculateTimeMargin(timeDifference, totalTimeSpan, availableWidth);
    }
    
    return {
      ...artwork,
      timeDifference,
      timeMargin
    };
  });

  // Restore original order
  const result = new Array(artworks.length);
  sortedWithTimeMargin.forEach(artwork => {
    const { originalIndex, ...artworkWithoutIndex } = artwork;
    result[originalIndex] = artworkWithoutIndex;
  });

  return result;
};

// Helper function to normalize timestamps to Date objects
function normalizeDate(date: Date | string | number): Date {
  if (date instanceof Date) {
    return date;
  }
  if (typeof date === 'string') {
    return new Date(date);
  }
  if (typeof date === 'number') {
    // Assume Unix timestamp in milliseconds if > 1e12, otherwise seconds
    return new Date(date > 1e12 ? date : date * 1000);
  }
  throw new Error('Invalid date format');
}

// Utility function to get total margin for all artworks
export const getTotalTimeMargin = (artworks: ArtworkWithTimeMargin[]): number => {
  return artworks.reduce((total, artwork) => total + artwork.timeMargin, 0);
};

// Utility function to get time span info
export const getTimeSpanInfo = (artworks: Artwork[]) => {
  if (artworks.length === 0) return null;
  
  const sortedArtworks = [...artworks].sort((a, b) => {
    const dateA = normalizeDate(a.date);
    const dateB = normalizeDate(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  const startDate = normalizeDate(sortedArtworks[0].date);
  const endDate = normalizeDate(sortedArtworks[sortedArtworks.length - 1].date);
  const totalTimeSpan = endDate.getTime() - startDate.getTime();
  const totalMonths = totalTimeSpan / MILLISECONDS_PER_MONTH;
  
  return {
    startDate,
    endDate,
    totalTimeSpan,
    totalMonths: Math.round(totalMonths * 100) / 100 // Round to 2 decimal places
  };
};

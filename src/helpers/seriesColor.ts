// Map of series slugs to their corresponding colors
const seriesColorMap: Record<string, string> = {
  'a-colorful-history': '#9DC3C2',      // ach
  'art-collision': '#99C2A2',           // col
  'digital-city-series': '#F6BD60',     // dcs
  'megacities': '#FC7753',              // meg
  'breaking-down-art': '#6D2E46',       // war
  'vanishing-landscapes': '#7B8CDE',    // van
  'og-oil-paintings': '#395B0E',        // og
  'installations': '#A27E8E',           // ins
  'photography': '#2D4654',             // pho
  'videos': '#996a3e',                  // vid
  'sold': '#d4af37',                    // sold (if needed)
};

/**
 * Returns the color associated with a series slug
 * @param seriesSlug - The slug of the series (e.g., 'megacities', 'digital-city-series')
 * @returns The hex color code, or a default color if not found
 */
export function getSeriesColor(seriesSlug: string): string {
  const color = seriesColorMap[seriesSlug.toLowerCase()];
  return color || '#999999'; // Default gray if series not found
}
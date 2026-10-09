/** Series slug → hex (design-system.md §2). Prefer `getSeriesColor()` in components. */
export const SERIES_COLOR_MAP: Record<string, string> = {
  'a-colorful-history': '#9DC3C2', // ach
  'art-collision': '#99C2A2', // col
  'digital-city-series': '#F6BD60', // dcs
  'megacities': '#E8453C', // meg — clear red, away from DCS orange
  'breaking-down-art': '#6D2E46', // bda
  'vanishing-landscapes': '#7B8CDE', // van
  'og-oil-paintings': '#395B0E', // og
  'installations': '#A27E8E', // ins
  'photography': '#2D4654', // pho
  'videos': '#8B5A2B', // vid — deepened, apart from performances terracotta
  drawings: '#8A93A0', // graphite blue-grey
  performances: '#C0714E', // terracotta
  watercolors: '#9FC5D8', // washed blue
  /** ACH sub-series — deeper teal off parent #9DC3C2 */
  'mediums-of-perception': '#6B8F9E',
  /** ACH sub-series — warm gate-stone, off ACH teal and MoP */
  'gates-of-perception': '#B08968',
  /** MoP nested triptych series — iron/olive, off MoP teal */
  'mediums-of-war': '#7A6B4F',
  sold: '#d4af37', // available-status gold (not a series)
}

/** Availability filter swatch — status, not a series. Live gold, not the screenshot hex. */
export const AVAILABLE_STATUS_COLOR = SERIES_COLOR_MAP.sold

/**
 * Returns the color associated with a series slug
 * @param seriesSlug - The slug of the series (e.g., 'megacities', 'digital-city-series')
 * @returns The hex color code, or a default color if not found
 */
export function getSeriesColor(seriesSlug: string): string {
  const color = SERIES_COLOR_MAP[seriesSlug.toLowerCase()]
  return color || '#999999'
}

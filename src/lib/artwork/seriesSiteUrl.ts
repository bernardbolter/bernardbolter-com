/** Dedicated series sites — keyed by top-level series slug. */
const SERIES_SITE_URLS: Record<string, string> = {
  'a-colorful-history': 'https://acolorfulhistory.com',
  'digital-city-series': 'https://digitalcityseries.com',
  'megacities': 'https://megacities.com',
  'art-collision': 'https://artcollision.com',
  'vanishing-landscapes': 'https://vanishinglandscapes.com',
  'breaking-down-art': 'https://breakingdownart.com',
  'smoothism': 'https://smoothism.com',
}

export function getSeriesSiteUrl(seriesSlug: string | null | undefined): string | null {
  if (!seriesSlug?.trim()) return null
  return SERIES_SITE_URLS[seriesSlug.toLowerCase()] ?? null
}

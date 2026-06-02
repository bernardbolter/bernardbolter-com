import { getSeriesColor } from '@/helpers/seriesColor'
import type { FilterCategory } from '@/types/frontend'

/** Series filter chips — slugs match Payload `series.slug` / `artworks.seriesSlug`. */
export const filterValues: FilterCategory[] = [
  { id: '01', slug: 'breaking-down-art', name: 'Mediums of War', color: getSeriesColor('breaking-down-art') },
  { id: '02', slug: 'a-colorful-history', name: 'A Colorful History', color: getSeriesColor('a-colorful-history') },
  { id: '03', slug: 'megacities', name: 'Megacities', color: getSeriesColor('megacities') },
  { id: '04', slug: 'digital-city-series', name: 'Digital City Series', color: getSeriesColor('digital-city-series') },
  { id: '05', slug: 'art-collision', name: 'Art Collision', color: getSeriesColor('art-collision') },
  { id: '06', slug: 'vanishing-landscapes', name: 'Vanishing Landscapes', color: getSeriesColor('vanishing-landscapes') },
  { id: '07', slug: 'og-oil-paintings', name: 'OG Artwork', color: getSeriesColor('og-oil-paintings') },
  { id: '08', slug: 'installations', name: 'Installations', color: getSeriesColor('installations') },
  { id: '09', slug: 'photography', name: 'Photography', color: getSeriesColor('photography') },
  { id: '10', slug: 'videos', name: 'Videos', color: getSeriesColor('videos') },
]

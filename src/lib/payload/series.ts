import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import { getSeriesColor } from '@/helpers/seriesColor'
import type { SeriesMention } from '@/lib/bio/linkSeriesMentions'
import type { FilterCategory } from '@/types/frontend'
import type { Series } from '@/payload-types'

const getPayloadInstance = async () => getPayload({ config })

function mapSeriesToFilterCategory(doc: Series): FilterCategory {
  return {
    id: String(doc.id),
    slug: doc.slug,
    name: doc.name,
    color: getSeriesColor(doc.slug),
  }
}

async function fetchFilterSeries(): Promise<FilterCategory[]> {
  const payload = await getPayloadInstance()

  const result = await payload.find({
    collection: 'series',
    where: {
      and: [{ status: { equals: 'published' } }, { parentSeries: { exists: false } }],
    },
    sort: 'name',
    depth: 0,
    limit: 100,
    overrideAccess: false,
  })

  return result.docs.map(mapSeriesToFilterCategory)
}

const getCachedFilterSeries = unstable_cache(fetchFilterSeries, ['series-filter-nav'], {
  revalidate: 3600,
  tags: ['series'],
})

/** Published root-level series for the filter drawer (excludes sub-series). */
export async function getFilterSeries(): Promise<FilterCategory[]> {
  if (process.env.NODE_ENV === 'development') {
    return fetchFilterSeries()
  }
  return getCachedFilterSeries()
}

async function fetchPublishedSeriesMentions(): Promise<SeriesMention[]> {
  const payload = await getPayloadInstance()

  const result = await payload.find({
    collection: 'series',
    where: { status: { equals: 'published' } },
    sort: 'name',
    depth: 0,
    limit: 100,
    overrideAccess: false,
  })

  return result.docs
    .filter((doc) => doc.name?.trim() && doc.slug?.trim())
    .map((doc) => ({ name: doc.name.trim(), slug: doc.slug.trim() }))
}

export type { SeriesMention }

const getCachedPublishedSeriesMentions = unstable_cache(
  fetchPublishedSeriesMentions,
  ['series-bio-mentions'],
  {
    revalidate: 3600,
    tags: ['series'],
  },
)

/** Published series names/slugs for auto-linking mentions in bio prose. */
export async function getPublishedSeriesMentions(): Promise<SeriesMention[]> {
  if (process.env.NODE_ENV === 'development') {
    return fetchPublishedSeriesMentions()
  }
  return getCachedPublishedSeriesMentions()
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import Artworks from '@/components/artworks/Artworks'
import HeaderTitle from '@/components/info/HeaderTitle'
import { Nav } from '@/components/navs'
import SeriesPageInit from '@/components/series/SeriesPageInit'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getPerson } from '@/lib/payload/person'
import { getSeriesBySlug } from '@/lib/payload/seriesPage'
import { getPublishedSeriesSlugs } from '@/lib/payload/staticParams'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { generateSeriesJsonLd } from '@/utilities/generateSeriesJsonLd'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const slugs = await getPublishedSeriesSlugs()
    return slugs.map((slug) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const series = await getSeriesBySlug(slug)
  if (!series) {
    return { title: 'Series not found' }
  }

  const description = lexicalToPlain(series.description).replace(/\s+/g, ' ').trim()

  return {
    title: series.name,
    description: description || `${series.name} — artworks by Bernard Bolter.`,
    alternates: { canonical: `/series/${slug}` },
  }
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params
  const [series, artist] = await Promise.all([getSeriesBySlug(slug), getPerson()])
  if (!series) notFound()

  const jsonLd = artist ? generateSeriesJsonLd(series, artist, { baseUrl: getSiteBaseUrl() }) : null

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-surface-page text-dark">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <SeriesPageInit seriesSlug={series.slug} />
      <HeaderTitle title={series.name} large />
      <Nav />
      <Artworks />
    </main>
  )
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildEventJsonLd } from '@/lib/jsonld/event'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getArtistGlobal, getPublishedEventBySlug } from '@/lib/payload/siteDocuments'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getPublishedEventBySlug(slug)
  if (!event) {
    return { title: 'Event' }
  }
  const base = getSiteBaseUrl()
  return {
    title: event.title,
    description: event.descriptionShort ?? undefined,
    alternates: { canonical: `${base}/events/${slug}` },
  }
}

export default async function EventJsonLdPage({ params }: Props) {
  const { slug } = await params
  const [event, artist] = await Promise.all([getPublishedEventBySlug(slug), getArtistGlobal()])
  if (!event) notFound()

  const jsonLd = buildEventJsonLd(event, artist)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <h1>{event.title}</h1>
      </main>
    </>
  )
}

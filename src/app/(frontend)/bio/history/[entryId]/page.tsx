import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import BioProse from '@/components/bio/BioProse'
import {
  findHistoricalBio,
} from '@/lib/artist/accumulatingEntries'
import { getBioPageArtist } from '@/lib/payload/bioPage'

export const revalidate = 3600

type PageProps = { params: Promise<{ entryId: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entryId } = await params
  const artist = await getBioPageArtist()
  const entry = artist ? findHistoricalBio(artist, entryId) : null
  if (!entry) return { title: 'Historical bio' }
  return {
    title: `Bio — ${entry.date}`,
    alternates: { canonical: `/bio/history/${entryId}` },
  }
}

export default async function HistoricalBioPage({ params }: PageProps) {
  const { entryId } = await params
  const artist = await getBioPageArtist()
  const entry = artist ? findHistoricalBio(artist, entryId) : null
  if (!entry) notFound()

  const dateLabel = entry.date
    ? new Date(entry.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Undated'

  return (
    <div className="bio-page__container">
      <DocumentScrollShell
        title="BIO"
        closeHref="/bio"
        scrollClassName="bio-container"
        closeClassName="bio__close-container"
      >
        <div className="bio__content-container">
          <p className="bio__tagline">{dateLabel}</p>
          {entry.context ? <p className="bio__masonry-caption">{entry.context}</p> : null}
          <BioProse content={entry.fullText} />
        </div>
      </DocumentScrollShell>
    </div>
  )
}

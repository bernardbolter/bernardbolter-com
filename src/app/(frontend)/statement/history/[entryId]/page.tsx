import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import BioProse from '@/components/bio/BioProse'
import { findHistoricalStatement } from '@/lib/artist/accumulatingEntries'
import { getStatementPageArtist } from '@/lib/payload/statementPage'

export const revalidate = 3600

type PageProps = { params: Promise<{ entryId: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entryId } = await params
  const artist = await getStatementPageArtist()
  const entry = artist ? findHistoricalStatement(artist, entryId) : null
  if (!entry) return { title: 'Historical statement' }
  return {
    title: `Statement — ${entry.date}`,
    alternates: { canonical: `/statement/history/${entryId}` },
  }
}

export default async function HistoricalStatementPage({ params }: PageProps) {
  const { entryId } = await params
  const artist = await getStatementPageArtist()
  const entry = artist ? findHistoricalStatement(artist, entryId) : null
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
        title="STATEMENT"
        titleLarge
        closeHref="/statement"
        scrollClassName="bio-container statement-page"
        closeClassName="bio__close-container"
        contentClassName="bio__content-container"
      >
        <p className="bio__tagline">{dateLabel}</p>
        {entry.context ? <p className="bio__masonry-caption">{entry.context}</p> : null}
        <BioProse content={entry.fullText} />
      </DocumentScrollShell>
    </div>
  )
}

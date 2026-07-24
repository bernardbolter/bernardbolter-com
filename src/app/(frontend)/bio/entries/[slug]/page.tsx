import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import BioEntryPage from '@/components/BioEntry/BioEntryPage'
import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { collectSessionSiblingLinks } from '@/components/shared/SessionSiblingLinks'
import { attachPublicSessionRefs } from '@/lib/artist/attachPublicSessionRefs'
import { resolveSessionNumericId } from '@/lib/artist/accumulatingEntries'
import { linkedArtworksToCards } from '@/lib/artist/linkedArtworksToCards'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getBioPageArtist } from '@/lib/payload/bioPage'
import type { Session } from '@/payload-types'

export const revalidate = 3600

type PageProps = { params: Promise<{ slug: string }> }

function buildEntryJsonLd(options: {
  slug: string
  text: string
  eventDate: string | null
  session: Session | null
  baseUrl: string
}): Record<string, unknown> {
  const { slug, text, eventDate, session, baseUrl } = options
  const basedOn =
    session?.status === 'completed' && session.sessionId
      ? `${baseUrl}/sessions/${session.sessionId}`
      : undefined
  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      artism: 'https://artism.org/schema/',
    },
    '@type': 'CreativeWork',
    '@id': `${baseUrl}/bio/entries/${slug}`,
    name: text.slice(0, 120),
    url: `${baseUrl}/bio/entries/${slug}`,
    ...(eventDate ? { 'artism:eventDate': eventDate } : {}),
    ...(basedOn ? { isBasedOn: basedOn } : {}),
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const raw = await getBioPageArtist()
  const entry = raw?.bioTimelineEntries?.find((e) => e.slug === slug)
  return {
    title: entry?.text?.slice(0, 60) || 'Bio entry',
    alternates: { canonical: `/bio/entries/${slug}` },
  }
}

export default async function BioEntryPermalinkPage({ params }: PageProps) {
  const { slug } = await params
  const rawArtist = await getBioPageArtist()
  if (!rawArtist) notFound()
  const artist = await attachPublicSessionRefs(rawArtist)

  const entry = (artist.bioTimelineEntries ?? []).find(
    (e) => e.slug === slug && (e.visibility ?? 'public') === 'public',
  )
  if (!entry?.text?.trim()) notFound()

  const sourceSession =
    entry.sourceSessionRef && typeof entry.sourceSessionRef === 'object'
      ? (entry.sourceSessionRef as Session)
      : null
  const sourceSessionId = resolveSessionNumericId(entry.sourceSessionRef)
  const siblings =
    sourceSessionId != null
      ? collectSessionSiblingLinks({
          artist,
          sourceSessionId,
          excludeSlug: entry.slug,
        })
      : []

  const baseUrl = getSiteBaseUrl()
  const jsonLd = buildEntryJsonLd({
    slug: entry.slug!,
    text: entry.text.trim(),
    eventDate: entry.eventDate?.trim() || null,
    session: sourceSession,
    baseUrl,
  })

  return (
    <div className="bio-page__container">
      <JsonLdScript data={jsonLd} />
      <DocumentScrollShell
        title="BIO ENTRY"
        closeHref="/bio"
        scrollClassName="bio-container"
        closeClassName="bio__close-container"
      >
        <div className="bio__content-container">
          <BioEntryPage
            eventDate={entry.eventDate?.trim() || null}
            text={entry.text.trim()}
            discoveryExcerpt={entry.discoveryExcerpt}
            artworks={linkedArtworksToCards(entry.linkedArtworkSlugs)}
            sourceSession={sourceSession}
            siblings={siblings}
          />
        </div>
      </DocumentScrollShell>
    </div>
  )
}

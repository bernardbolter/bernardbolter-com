import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import BioEntryPage from '@/components/BioEntry/BioEntryPage'
import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { collectSessionSiblingLinks } from '@/components/shared/SessionSiblingLinks'
import { attachPublicSessionRefs } from '@/lib/artist/attachPublicSessionRefs'
import { resolveSessionNumericId } from '@/lib/artist/accumulatingEntries'
import { linkedArtworksToCards } from '@/lib/artist/linkedArtworksToCards'
import { CORPUS_CONTEXT } from '@/lib/corpus/constants'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getBioPageArtist } from '@/lib/payload/bioPage'
import { maybePermanentRedirect } from '@/lib/redirects/maybeRedirect'
import type { Session } from '@/payload-types'

export const revalidate = 3600

type PageProps = { params: Promise<{ slug: string }> }

function buildEntryJsonLd(options: {
  slug: string
  name: string
  text: string
  eventDate: string | null
  session: Session | null
  baseUrl: string
}): Record<string, unknown> {
  const { slug, name, text, eventDate, session, baseUrl } = options
  const basedOn =
    session?.status === 'completed' && session.sessionId
      ? `${baseUrl}/sessions/${session.sessionId}`
      : undefined
  return {
    '@context': CORPUS_CONTEXT,
    '@type': 'CreativeWork',
    '@id': `${baseUrl}/bio/entries/${slug}`,
    name,
    description: text,
    url: `${baseUrl}/bio/entries/${slug}`,
    ...(eventDate ? { 'art-official:eventDate': eventDate } : {}),
    ...(basedOn ? { isBasedOn: basedOn } : {}),
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const raw = await getBioPageArtist()
  const entry = raw?.bioTimelineEntries?.find((e) => e.slug === slug)
  const title =
    entry?.shortTitle?.trim() || entry?.text?.trim()?.slice(0, 60) || 'Bio entry'
  return {
    title,
    alternates: { canonical: `/bio/entries/${slug}` },
  }
}

export default async function BioEntryPermalinkPage({ params }: PageProps) {
  const { slug } = await params
  const rawArtist = await getBioPageArtist()
  if (!rawArtist) {
    const payload = await getPayload({ config })
    await maybePermanentRedirect(payload, `/bio/entries/${slug}`)
    notFound()
  }
  const artist = await attachPublicSessionRefs(rawArtist)

  const entry = (artist.bioTimelineEntries ?? []).find(
    (e) => e.slug === slug && (e.visibility ?? 'public') === 'public',
  )
  if (!entry?.text?.trim()) {
    const payload = await getPayload({ config })
    await maybePermanentRedirect(payload, `/bio/entries/${slug}`)
    notFound()
  }

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
  const shortTitle = entry.shortTitle?.replace(/\s+/g, ' ').trim() || null
  const claim = entry.text.trim()
  const jsonLd = buildEntryJsonLd({
    slug: entry.slug!,
    name: shortTitle || claim,
    text: claim,
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
            shortTitle={shortTitle}
            text={claim}
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

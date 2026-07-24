import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { collectSessionSiblingLinks } from '@/components/shared/SessionSiblingLinks'
import ThroughlinePage, {
  type ReinforcementRow,
} from '@/components/Throughline/ThroughlinePage'
import { attachPublicSessionRefs } from '@/lib/artist/attachPublicSessionRefs'
import { resolveSessionNumericId } from '@/lib/artist/accumulatingEntries'
import { linkedArtworksToCards } from '@/lib/artist/linkedArtworksToCards'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getStatementPageArtist } from '@/lib/payload/statementPage'
import type { Session } from '@/payload-types'

export const revalidate = 3600

type PageProps = { params: Promise<{ slug: string }> }

function readSession(value: number | Session | null | undefined): Session | null {
  if (!value || typeof value !== 'object') return null
  if (value.status !== 'completed' || !value.sessionId) return null
  return value
}

function formatRecognized(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function buildThroughlineJsonLd(options: {
  slug: string
  text: string
  dateRecognized: string | null
  origin: Session | null
  reinforcing: Session[]
  baseUrl: string
}): Record<string, unknown> {
  const { slug, text, dateRecognized, origin, reinforcing, baseUrl } = options
  const basedOn = [origin, ...reinforcing]
    .filter((s): s is Session => Boolean(s?.sessionId))
    .map((s) => `${baseUrl}/sessions/${s.sessionId}`)

  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      artism: 'https://artism.org/schema/',
    },
    '@type': 'CreativeWork',
    '@id': `${baseUrl}/statement/throughlines/${slug}`,
    name: text.slice(0, 120),
    url: `${baseUrl}/statement/throughlines/${slug}`,
    ...(dateRecognized ? { 'artism:dateRecognized': dateRecognized } : {}),
    ...(basedOn.length === 1
      ? { isBasedOn: basedOn[0] }
      : basedOn.length > 1
        ? { isBasedOn: basedOn }
        : {}),
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const raw = await getStatementPageArtist()
  const entry = raw?.statementThroughlines?.find((e) => e.slug === slug)
  return {
    title: entry?.text?.slice(0, 60) || 'Throughline',
    alternates: { canonical: `/statement/throughlines/${slug}` },
  }
}

export default async function ThroughlinePermalinkPage({ params }: PageProps) {
  const { slug } = await params
  const rawArtist = await getStatementPageArtist()
  if (!rawArtist) notFound()
  const artist = await attachPublicSessionRefs(rawArtist)

  const entry = (artist.statementThroughlines ?? []).find(
    (e) => e.slug === slug && (e.visibility ?? 'public') === 'public',
  )
  if (!entry?.text?.trim()) notFound()

  const origin = readSession(entry.sourceSessionRef as number | Session | null)
  const reinforcingSessions = (entry.reinforcingSessions ?? [])
    .map((row) => {
      if (!row || typeof row !== 'object' || !('session' in row)) return null
      const session = readSession(row.session as number | Session | null)
      if (!session) return null
      return {
        session,
        note: row.reinforcementNote?.trim() || null,
        id: row.id ?? null,
      }
    })
    .filter((row): row is { session: Session; note: string | null; id: string | null } =>
      row !== null,
    )

  const reinforcementRows: ReinforcementRow[] = []
  if (origin) {
    reinforcementRows.push({
      key: `origin-${origin.sessionId}`,
      session: origin,
      note: null,
      isOrigin: true,
    })
  }
  for (const row of reinforcingSessions) {
    reinforcementRows.push({
      key: `r-${row.id ?? row.session.sessionId}`,
      session: row.session,
      note: row.note,
      isOrigin: false,
    })
  }
  reinforcementRows.sort((a, b) => {
    const aTime = a.session.completedAt ? Date.parse(a.session.completedAt) : 0
    const bTime = b.session.completedAt ? Date.parse(b.session.completedAt) : 0
    return aTime - bTime
  })

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
  const jsonLd = buildThroughlineJsonLd({
    slug: entry.slug!,
    text: entry.text.trim(),
    dateRecognized: entry.dateRecognized ?? null,
    origin,
    reinforcing: reinforcingSessions.map((r) => r.session),
    baseUrl,
  })

  return (
    <div className="bio-page__container">
      <JsonLdScript data={jsonLd} />
      <DocumentScrollShell
        title="THROUGHLINE"
        closeHref="/statement"
        scrollClassName="bio-container"
        closeClassName="bio__close-container"
      >
        <div className="bio__content-container">
          <ThroughlinePage
            dateRecognized={formatRecognized(entry.dateRecognized)}
            text={entry.text.trim()}
            discoveryExcerpt={entry.discoveryExcerpt}
            artworks={linkedArtworksToCards(entry.linkedArtworkSlugs, { sortByYear: true })}
            reinforcementRows={reinforcementRows}
            siblings={siblings}
          />
        </div>
      </DocumentScrollShell>
    </div>
  )
}

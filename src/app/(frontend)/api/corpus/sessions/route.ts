import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { getSiteBaseUrl } from '@/lib/jsonld/site'
import config from '@payload-config'
import type { Artwork } from '@/payload-types'

export const revalidate = 3600

type SessionCrumbSource = {
  id: number
  sessionId?: string | null
  sessionType: string
  status: string
  completedAt?: string | null
  primaryArtwork?: number | Artwork | null
  artworkRecord?: number | Artwork | null
  mentionedArtworks?: (number | Artwork)[] | null
}

function readArtwork(value: number | Artwork | null | undefined): Artwork | null {
  if (!value || typeof value !== 'object') return null
  return value
}

function sessionPublicCrumb(session: SessionCrumbSource, baseUrl: string) {
  const sessionId = session.sessionId
  if (!sessionId) return null

  const primary =
    readArtwork(session.primaryArtwork) ?? readArtwork(session.artworkRecord)
  const mentioned = (session.mentionedArtworks ?? [])
    .map((entry) => readArtwork(entry))
    .filter((artwork): artwork is Artwork => artwork !== null)

  return {
    sessionId,
    sessionType: session.sessionType,
    status: session.status,
    completedAt: session.completedAt ?? null,
    url: `${baseUrl}/sessions/${sessionId}`,
    primaryArtwork: primary
      ? { slug: primary.slug, title: primary.title, url: `${baseUrl}/${primary.slug}` }
      : null,
    mentionedArtworks: mentioned.map((artwork) => ({
      slug: artwork.slug,
      title: artwork.title,
      url: `${baseUrl}/${artwork.slug}`,
    })),
  }
}

/**
 * Tier 5 crumbs only — completed sessions, no transcripts / messages.
 * Optional ?artwork=[slug] filters primary or mentioned.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const artworkSlug = searchParams.get('artwork')?.trim() || null
  const baseUrl = getSiteBaseUrl()
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'sessions',
    where: { status: { equals: 'completed' } },
    limit: 200,
    depth: 1,
    sort: '-completedAt',
    select: {
      sessionId: true,
      sessionType: true,
      status: true,
      completedAt: true,
      primaryArtwork: true,
      artworkRecord: true,
      mentionedArtworks: true,
    },
  })

  let sessions = result.docs
    .map((session) => sessionPublicCrumb(session, baseUrl))
    .filter((session): session is NonNullable<typeof session> => session !== null)

  if (artworkSlug) {
    sessions = sessions.filter((session) => {
      if (session.primaryArtwork?.slug === artworkSlug) return true
      return session.mentionedArtworks.some((artwork) => artwork.slug === artworkSlug)
    })
  }

  return NextResponse.json(
    {
      '@type': 'DataFeed',
      name: 'Bernard Bolter — Completed sessions (public crumbs)',
      url: artworkSlug
        ? `${baseUrl}/api/corpus/sessions?artwork=${encodeURIComponent(artworkSlug)}`
        : `${baseUrl}/api/corpus/sessions`,
      'artism:tier': 5,
      'artism:totalSessions': sessions.length,
      dataFeedElement: sessions,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    },
  )
}

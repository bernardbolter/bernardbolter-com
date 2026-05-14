import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { buildCvSections } from '@/lib/cv/buildCvSections'
import config from '@payload-config'

const defaultLocale = 'en' as const

type RouteParams = { params: Promise<{ artistSlug: string }> }

/**
 * Read-only CV assembly: artist row, biography practice-knowledge, events, selected works.
 * Single-tenant: all published events are included (no per-event artist relation yet).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { artistSlug } = await params
  const payload = await getPayload({ config })

  const artistRes = await payload.find({
    collection: 'artists',
    locale: defaultLocale,
    where: { slug: { equals: artistSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })
  const artist = artistRes.docs[0]
  if (!artist) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
  }

  const bioRes = await payload.find({
    collection: 'practice-knowledge',
    locale: defaultLocale,
    where: {
      and: [{ slug: { equals: 'biography' } }, { status: { equals: 'active' } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })
  const biography = bioRes.docs[0] ?? null

  const eventsRes = await payload.find({
    collection: 'events',
    locale: defaultLocale,
    where: {
      and: [{ status: { equals: 'published' } }, { excludeFromCv: { not_equals: true } }],
    },
    sort: '-startDate',
    limit: 500,
    depth: 0,
    overrideAccess: false,
  })

  const worksRes = await payload.find({
    collection: 'artworks',
    locale: defaultLocale,
    where: {
      and: [
        { status: { equals: 'published' } },
        { recordOrigin: { equals: 'artist-catalogued' } },
      ],
    },
    sort: '-yearCreated',
    limit: 80,
    depth: 0,
    overrideAccess: false,
    select: {
      id: true,
      title: true,
      slug: true,
      yearCreated: true,
      availabilityStatus: true,
    },
  })

  const sections = buildCvSections(eventsRes.docs, artist)

  return NextResponse.json({
    artist: {
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
    },
    biography: biography ?
      {
        slug: biography.slug,
        sectionLabel: biography.sectionLabel,
        order: biography.order,
      }
    : null,
    sections,
    selectedWorks: worksRes.docs.map((w) => ({
      id: w.id,
      title: w.title,
      slug: w.slug,
      yearCreated: w.yearCreated,
      availabilityStatus: w.availabilityStatus,
    })),
  })
}

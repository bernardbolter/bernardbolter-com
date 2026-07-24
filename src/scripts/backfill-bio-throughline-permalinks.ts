/**
 * Backfill slugs + discoveryExcerpt for Venice-era bio entries and throughline
 * (docs/corpus/bio-throughline-permalink-pages-spec.md Step 8).
 *
 * Idempotent: skips rows that already have discoveryExcerpt; always ensures slugs.
 *
 * Usage: npx tsx src/scripts/backfill-bio-throughline-permalinks.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@payload-config'

import { plainToLexical } from '@/lib/artOfficial/plainToLexical'
import { slugifyArtworkTitle } from '@/lib/artOfficial/quickUploadDerived'

const BIO_1996_KEY =
  "after the sfmoma guerrilla installation, a three-part series attempting to bring photographs back into painting"

const BIO_2007_KEY =
  'on a rietveld akademie school trip to the venice biennale'

const THROUGHLINE_KEY = 'a recurring inside/outside position'

const EXCERPTS: Record<string, { match: string; excerpt: string; slugHint: string }> = {
  bio1996: {
    match: BIO_1996_KEY,
    slugHint: 'sfmoma-guerrilla-1996-seed',
    excerpt:
      'In the Venice Biennale 2007 session, Bolter traced the Breaking Down Art series back past Venice to its origin: after the SFMOMA guerrilla installation, a three-part series trying to bring photographs back into painting "didn\'t all work out" — then ~30 written ideas about art that became the seed of the series.',
  },
  bio2007: {
    match: BIO_2007_KEY,
    slugHint: 'venice-biennale-2007-doubled-operation',
    excerpt:
      'Cataloguing Venice Biennale 2007 surfaced a doubled operation unrecognized at the time: photographing Breaking Down Art material from inside the Arsenale while shooting the Venice DCS scene from just outside the same building — on a Rietveld Akademie school trip.',
  },
  throughline: {
    match: THROUGHLINE_KEY,
    slugHint: 'inside-outside-position',
    excerpt:
      'Named in the same Venice/Münster linchpin session: a recurring inside/outside position — in 2007–08 working from inside the art-school system, half in awe of a world he wasn\'t sure he belonged to; now fully outside it, on his own path — and that outside position may be exactly what\'s needed to return to Breaking Down Art\'s unfinished questions.',
  },
}

function textKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function hasDiscoveryExcerpt(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const root = (value as { root?: { children?: unknown[] } }).root
  return Boolean(root?.children?.length)
}

async function main() {
  const payload = await getPayload({ config })
  const artists = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const artist = artists.docs[0]
  if (!artist) {
    console.error('No artist record found.')
    process.exit(1)
  }

  const usedSlugs = new Set<string>()
  const bios = [...(artist.bioTimelineEntries ?? [])].map((entry) => {
    const key = textKey(entry.text ?? '')
    let slug = entry.slug?.trim() || ''
    let discoveryExcerpt = entry.discoveryExcerpt

    if (key.includes(EXCERPTS.bio1996.match)) {
      if (!slug) slug = EXCERPTS.bio1996.slugHint
      if (!hasDiscoveryExcerpt(discoveryExcerpt)) {
        discoveryExcerpt = plainToLexical(EXCERPTS.bio1996.excerpt)
        console.log('Backfilled discoveryExcerpt for bio 1996 entry')
      } else {
        console.log('Bio 1996 discoveryExcerpt already present — skip excerpt')
      }
    } else if (key.includes(EXCERPTS.bio2007.match)) {
      if (!slug) slug = EXCERPTS.bio2007.slugHint
      if (!hasDiscoveryExcerpt(discoveryExcerpt)) {
        discoveryExcerpt = plainToLexical(EXCERPTS.bio2007.excerpt)
        console.log('Backfilled discoveryExcerpt for bio 2007 entry')
      } else {
        console.log('Bio 2007 discoveryExcerpt already present — skip excerpt')
      }
    }

    if (!slug) slug = slugifyArtworkTitle(entry.text ?? entry.id ?? 'entry')
    while (usedSlugs.has(slug)) slug = `${slug}-x`
    usedSlugs.add(slug)

    return { ...entry, slug, discoveryExcerpt }
  })

  const throughlines = [...(artist.statementThroughlines ?? [])].map((entry) => {
    const key = textKey(entry.text ?? '')
    let slug = entry.slug?.trim() || ''
    let discoveryExcerpt = entry.discoveryExcerpt
    let reinforcingSessions = entry.reinforcingSessions

    // Normalize legacy hasMany IDs → empty array groups if somehow still present
    if (
      Array.isArray(reinforcingSessions) &&
      reinforcingSessions.length > 0 &&
      typeof reinforcingSessions[0] !== 'object'
    ) {
      console.warn(
        'Throughline had legacy reinforcingSessions IDs — clearing to [] (expected empty).',
      )
      reinforcingSessions = []
    }
    if (!reinforcingSessions) reinforcingSessions = []

    if (key.includes(EXCERPTS.throughline.match)) {
      if (!slug) slug = EXCERPTS.throughline.slugHint
      if (!hasDiscoveryExcerpt(discoveryExcerpt)) {
        discoveryExcerpt = plainToLexical(EXCERPTS.throughline.excerpt)
        console.log('Backfilled discoveryExcerpt for inside/outside throughline')
      } else {
        console.log('Throughline discoveryExcerpt already present — skip excerpt')
      }
    }

    if (!slug) slug = slugifyArtworkTitle(entry.text ?? entry.id ?? 'throughline')
    while (usedSlugs.has(slug)) slug = `${slug}-x`
    usedSlugs.add(slug)

    return {
      ...entry,
      slug,
      discoveryExcerpt,
      reinforcingSessions,
    }
  })

  await payload.update({
    collection: 'artists',
    id: artist.id,
    data: {
      bioTimelineEntries: bios,
      statementThroughlines: throughlines,
    },
    overrideAccess: true,
  })

  console.log('Done. Permalinks:')
  for (const entry of bios) {
    if (entry.slug) console.log(`  /bio/entries/${entry.slug}`)
  }
  for (const entry of throughlines) {
    if (entry.slug) console.log(`  /statement/throughlines/${entry.slug}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

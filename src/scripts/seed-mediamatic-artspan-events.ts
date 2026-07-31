/**
 * Seed Mediamatic Pecha Kucha 2009 + ArtSpan Selections 2017 events,
 * set Artist.nameLegal, create/dedupe People, link jurors/otherParticipants,
 * link lombard-street-1922-v2 + baker-beach-1935, and seed completed event sessions.
 *
 * Spec: docs/events/events-mediamatic-artspan-spec.md
 *
 * Prerequisites: npx tsx src/scripts/add-event-jurors-participants-schema.ts
 *
 * Usage: npx tsx src/scripts/seed-mediamatic-artspan-events.ts
 */
import { getPayload } from 'payload'

import config from '@payload-config'
import { plainToLexical } from '@/lib/artOfficial/plainToLexical'
import type { Person } from '@/payload-types'
import {
  ARTSPAN_MESSAGES,
  ARTSPAN_SESSION_ID,
  ARTSPAN_SESSION_NOTES,
  MEDIAMATIC_MESSAGES,
  MEDIAMATIC_REFINEMENT_NOTES,
  MEDIAMATIC_SESSION_ID,
  MEDIAMATIC_SESSION_NOTES,
} from '@/scripts/data/mediamaticArtspanSessionTranscripts'

const MEDIAMATIC_SLUG = 'pecha-kucha-amsterdam-vol-9-mediamatic-2009'
/** Pre-existing Quick Event stub slug — enrich in place rather than duplicating. */
const MEDIAMATIC_SLUG_ALIASES = ['pecha-kucha-amsterdam-2009'] as const

const ARTSPAN_SLUG = 'artspan-selections-2017-heron-arts'
const ARTSPAN_SLUG_ALIASES = ['artspan-selections-san-francisco-2017'] as const

const LEGAL_NAME = 'Bernard John Bolter IV'

/** Joint-credit duo — two Person records, two coExhibitors rows (schema has no joint-credit object). */
const ARTSPAN_CO_EXHIBITOR_DUO: Array<{ name: string; role: string; personRoles: Person['role'] }> =
  [
    {
      name: 'Jason Mitchell',
      role: 'Ransom & Mitchell — photographer / director',
      personRoles: ['artist'],
    },
    {
      name: 'Stacey Ransom',
      role: 'Ransom & Mitchell — set designer / digital artist',
      personRoles: ['artist'],
    },
  ]

const ARTSPAN_CO_EXHIBITORS = [
  'Carlo Abruzzese',
  'Randy Beckelheimer',
  '/eE.l.os/',
  'Rodney Ewing',
  'Lea Feinstein',
  'Vince Koloski',
  'Katja Leibenath',
  'Catherine Mackey',
  'Sawyer Rose',
  'Brian Singer',
  'Paula Valenzuela',
] as const

const ARTSPAN_JURORS: Array<{ name: string; role: string }> = [
  { name: 'Julie Phelps', role: 'Artistic Director, CounterPulse' },
  { name: 'Jessica Shaefer', role: 'Project Director, Site Unseen' },
  { name: 'Meg Shiffler', role: 'Director, SFAC Galleries' },
  {
    name: 'Elizabeth "Bettie June" Scarborough',
    role: "Independent Curator; Executive Director, She's Got Wings",
  },
  { name: 'Noah Antieau', role: 'Co-Director, Heron Arts' },
  { name: 'Maria Jenson', role: 'Executive Director, SOMArts Cultural Center' },
]

const MEDIAMATIC_OTHER_PARTICIPANTS: Array<{ name: string; role: string }> = [
  { name: 'Rory Hyde', role: 'fellow presenter, Pecha Kucha Vol. 9' },
  { name: 'Rogier Klomp', role: 'fellow presenter, Pecha Kucha Vol. 9' },
  { name: 'Bart-Jan Kazemier', role: 'fellow presenter, Pecha Kucha Vol. 9' },
]

/** Confirmed live ArtSpan works (spec Part 9) — do not create stubs. */
const ARTSPAN_ARTWORK_SLUGS = ['lombard-street-1922-v2', 'baker-beach-1935'] as const

const SESSION_COMPLETED_AT = '2026-07-31T18:00:00.000Z'
const SESSION_CREATED_AT = '2026-07-31T16:00:00.000Z'

type PayloadClient = Awaited<ReturnType<typeof getPayload>>

async function findPersonByName(payload: PayloadClient, name: string): Promise<Person | null> {
  const exact = await payload.find({
    collection: 'people',
    where: { name: { equals: name } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (exact.docs[0]) return exact.docs[0]

  // Soft dedup: contains match for near-duplicates (e.g. with/without middle name).
  const fuzzy = await payload.find({
    collection: 'people',
    where: { name: { like: name } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  })
  if (fuzzy.docs.length === 1) {
    console.log(`  ↻ Reusing fuzzy People match for "${name}" → "${fuzzy.docs[0].name}" (id=${fuzzy.docs[0].id})`)
    return fuzzy.docs[0]
  }
  if (fuzzy.docs.length > 1) {
    console.warn(
      `  ⚠ Ambiguous People matches for "${name}": ${fuzzy.docs.map((d) => `${d.id}:${d.name}`).join(', ')} — creating new record.`,
    )
  }
  return null
}

async function upsertPerson(
  payload: PayloadClient,
  name: string,
  roles: Person['role'],
): Promise<{ id: number; created: boolean }> {
  const existing = await findPersonByName(payload, name)
  if (existing) return { id: existing.id, created: false }

  const created = await payload.create({
    collection: 'people',
    data: {
      name,
      role: roles,
    },
    overrideAccess: true,
  })
  return { id: created.id, created: true }
}

async function findArtworkBySlug(payload: PayloadClient, slug: string) {
  const found = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return found.docs[0] ?? null
}

async function resolveArtspanArtworkIds(payload: PayloadClient): Promise<number[]> {
  const ids: number[] = []
  for (const slug of ARTSPAN_ARTWORK_SLUGS) {
    const doc = await findArtworkBySlug(payload, slug)
    if (!doc) {
      console.warn(`⚠ Artwork "${slug}" not found — skip linking (do not create stub).`)
      continue
    }
    ids.push(doc.id)
    console.log(`✓ ArtSpan artwork linked: id=${doc.id} slug=${doc.slug} title="${doc.title}"`)
  }
  return ids
}

async function findEventBySlugs(payload: PayloadClient, slugs: string[]) {
  for (const slug of slugs) {
    const found = await payload.find({
      collection: 'events',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (found.docs[0]) return found.docs[0]
  }
  return null
}

async function upsertEvent(
  payload: PayloadClient,
  canonicalSlug: string,
  aliasSlugs: readonly string[],
  data: Record<string, unknown>,
): Promise<{ id: number; created: boolean; previousSlug: string | null }> {
  const existing = await findEventBySlugs(payload, [canonicalSlug, ...aliasSlugs])

  if (existing) {
    const updated = await payload.update({
      collection: 'events',
      id: existing.id,
      data: { ...data, slug: canonicalSlug } as never,
      overrideAccess: true,
      locale: 'en',
      context: { skipEmbedding: true },
    })
    return {
      id: updated.id,
      created: false,
      previousSlug: existing.slug !== canonicalSlug ? existing.slug : null,
    }
  }

  const created = await payload.create({
    collection: 'events',
    data: { ...data, slug: canonicalSlug } as never,
    overrideAccess: true,
    locale: 'en',
    context: { skipEmbedding: true },
  })
  return { id: created.id, created: true, previousSlug: null }
}

async function upsertEventSession(
  payload: PayloadClient,
  options: {
    sessionId: string
    eventId: number
    artistId: number
    messages: ReadonlyArray<{ role: string; content: string }>
    fieldUpdateTimeline: unknown[]
    agentModel: string
    sessionNotes: string
    dialogueRefinementFlag: boolean
    refinementNotes?: string | null
  },
): Promise<{ id: number; created: boolean }> {
  const existing = await payload.find({
    collection: 'sessions',
    where: { sessionId: { equals: options.sessionId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const data = {
    sessionId: options.sessionId,
    sessionType: 'event-enrichment' as const,
    status: 'completed' as const,
    artistId: options.artistId,
    eventRecord: options.eventId,
    eventDialoguePhase: 'phase-b-reasoning' as const,
    isExemplar: true,
    messages: [...options.messages],
    fieldUpdateTimeline: options.fieldUpdateTimeline,
    agentModel: options.agentModel,
    sessionNotes: options.sessionNotes,
    dialogueRefinementFlag: options.dialogueRefinementFlag,
    refinementNotes: options.refinementNotes ?? undefined,
    weakPhases: [],
    blindDescriptionUseful: null,
    formalContributionAccuracy: null,
    completedAt: SESSION_COMPLETED_AT,
  }

  if (existing.docs[0]) {
    const updated = await payload.update({
      collection: 'sessions',
      id: existing.docs[0].id,
      data: data as never,
      overrideAccess: true,
    })
    return { id: updated.id, created: false }
  }

  const created = await payload.create({
    collection: 'sessions',
    data: {
      ...data,
      createdAt: SESSION_CREATED_AT,
    } as never,
    overrideAccess: true,
  })
  return { id: created.id, created: true }
}

async function main() {
  const payload = await getPayload({ config })

  // --- Artist.nameLegal ---
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

  if (artist.nameLegal?.trim() !== LEGAL_NAME) {
    await payload.update({
      collection: 'artists',
      id: artist.id,
      data: { nameLegal: LEGAL_NAME },
      overrideAccess: true,
    })
    console.log(`✓ Artist.nameLegal → "${LEGAL_NAME}"`)
  } else {
    console.log(`✓ Artist.nameLegal already "${LEGAL_NAME}"`)
  }

  // --- People: Mediamatic ---
  const rik = await upsertPerson(payload, 'Rik', ['collaborator'])
  console.log(`✓ Rik People ${rik.created ? 'created' : 'reused'}: id=${rik.id}`)

  const otherParticipantRows: { person: number; role: string }[] = []
  for (const row of MEDIAMATIC_OTHER_PARTICIPANTS) {
    const person = await upsertPerson(payload, row.name, ['artist'])
    otherParticipantRows.push({ person: person.id, role: row.role })
    console.log(
      `✓ otherParticipant ${row.name} ${person.created ? 'created' : 'reused'}: id=${person.id}`,
    )
  }

  // --- Mediamatic event ---
  const mediamatic = await upsertEvent(payload, MEDIAMATIC_SLUG, MEDIAMATIC_SLUG_ALIASES, {
    title: 'Pecha Kucha Night Amsterdam Vol. 9',
    eventType: 'talk-panel',
    status: 'published',
    featured: true,
    startDate: '2009-01-01',
    yearStart: 2009,
    isOngoing: false,
    venueName: 'Mediamatic',
    venueCity: 'Amsterdam',
    venueCountry: 'Netherlands',
    // Inferred from Vol. 8/9-era Mediamatic location — flag if Vol. 9 address differs.
    venueAddress: 'Vijzelstraat 68, Amsterdam',
    venueWikidataUri: 'https://www.wikidata.org/wiki/Q13442007',
    sameAs: [{ uri: 'https://www.mediamatic.net/en/page/2249/pecha-kucha-amsterdam-9' }],
    pressUrl: 'https://www.mediamatic.net/en/page/2249/pecha-kucha-amsterdam-9',
    eventFormatType: 'Pecha Kucha (20x20)',
    coExhibitors: [{ person: rik.id, role: 'live djembe accompaniment' }],
    otherParticipants: otherParticipantRows,
    descriptionShort:
      "Presented the Digital City Series as a live freestyle rap performance over improvised djembe, third in the evening's lineup.",
    descriptionLong: plainToLexical(
      "Bernard's first Pecha Kucha performance, and the first of four he would go on to do (Amsterdam, Hamburg, Shenzhen, San Francisco). He came to it through existing ties to Mediamatic's events circle — he had attended many before this — and a suggestion from a friend involved in the Pop-Up City scene, who was connected to the evening's organisation. Using the Pecha Kucha format's 20 slides at 20 seconds each, he built the presentation as six introductory slides on the Digital City Series followed by fourteen slides, one per city, each rapped over live. Rather than a pre-recorded beat — the approach used at the later Hamburg and Shenzhen performances — a friend, Rik, played a djembe live and reactively for the performance. Bernard went up third in the lineup; nerves during the introductory section gave way to a smooth freestyle once the city sequence began. Of the four Pecha Kucha performances in this series, Amsterdam had the largest and most enthusiastic crowd — a combination, in Bernard's account, of language (English comprehension may have been higher than at the Hamburg and Shenzhen editions) and the live djembe, which worked better than the recorded beats used elsewhere.",
    ),
    artistNote:
      'First Pecha Kucha I did. Went up third. Nervous in the intro but the freestyle went smooth once it started. Rik improvised the whole beat live on djembe — worked way better than the recorded tracks I used for the later ones in Hamburg and Shenzhen. Wish I still had a recording.',
    practiceArcNote:
      'The start of a run of four Pecha Kucha performances presenting the Digital City Series — Amsterdam, Hamburg, Shenzhen, and San Francisco. This one, in hindsight, was the strongest: biggest and most enthusiastic crowd, and the only one with a live djembe player reacting in real time rather than a fixed recorded beat. The run ended at the fourth performance in San Francisco, which fell flat — partly an unhelpful sound engineer, partly a crowd already decades into the format (San Francisco being one of the two original Pecha Kucha cities alongside Tokyo, with this edition roughly the fortieth there) — and that letdown is where Bernard stopped doing them.',
    conceptualKeywords: [
      { keyword: 'performance' },
      { keyword: 'improvisation' },
      { keyword: 'live presentation' },
      { keyword: 'cities as subject matter' },
    ],
    eventTypeCustom: null,
    excludeFromCv: false,
    cvSection: 'talks-panels',
    cvPriority: 6,
  })
  console.log(
    `✓ Mediamatic event ${mediamatic.created ? 'created' : 'updated'}: id=${mediamatic.id} /events/${MEDIAMATIC_SLUG}` +
      (mediamatic.previousSlug ? ` (was ${mediamatic.previousSlug})` : ''),
  )

  // --- ArtSpan People ---
  const coExhibitorRows: { person: number; role?: string }[] = []
  for (const name of ARTSPAN_CO_EXHIBITORS) {
    const person = await upsertPerson(payload, name, ['artist'])
    coExhibitorRows.push({ person: person.id })
    console.log(`✓ coExhibitor ${name} ${person.created ? 'created' : 'reused'}: id=${person.id}`)
  }

  for (const member of ARTSPAN_CO_EXHIBITOR_DUO) {
    const person = await upsertPerson(payload, member.name, member.personRoles)
    // Optional website on create only — don't overwrite existing People notes.
    if (person.created) {
      await payload.update({
        collection: 'people',
        id: person.id,
        data: {
          website: 'https://art.ransommitchell.com',
          note: 'Exhibits jointly with the other half of Ransom & Mitchell.',
        },
        overrideAccess: true,
      })
    }
    coExhibitorRows.push({ person: person.id, role: member.role })
    console.log(
      `✓ coExhibitor duo member ${member.name} ${person.created ? 'created' : 'reused'}: id=${person.id} (${member.role})`,
    )
  }

  const jurorRows: { person: number; role: string }[] = []
  for (const row of ARTSPAN_JURORS) {
    const person = await upsertPerson(payload, row.name, ['curator'])
    jurorRows.push({ person: person.id, role: row.role })
    console.log(`✓ juror ${row.name} ${person.created ? 'created' : 'reused'}: id=${person.id}`)
  }

  const artworks = await resolveArtspanArtworkIds(payload)
  if (artworks.length < ARTSPAN_ARTWORK_SLUGS.length) {
    console.warn(
      `⚠ Only ${artworks.length}/${ARTSPAN_ARTWORK_SLUGS.length} ArtSpan artworks resolved — event will link what was found.`,
    )
  }

  const artspanPresentationNote =
    'Exhibited two A Colorful History pieces: Lombard Street . 1922 v2 (2017) — a newly repainted version made specifically for this show, distinct from an earlier original of the same subject — and Baker Beach . 1935 (2016). Both confirmed live at bernardbolter.com/lombard-street-1922-v2 and bernardbolter.com/baker-beach-1935.'

  const artspanDescriptionLong =
    "Selection into ArtSpan's 2017 Selections show grew out of several years of embeddedness in San Francisco's Mission-district co-op gallery scene, beginning with membership at City Art Gallery on Valencia Street. Through the artists already showing there, Bernard became involved with ArtSpan — participating in SF Open Studios, becoming a member, and getting into a couple of ArtSpan-sponsored exhibitions — before applying for and making the cut for Selections 2017, a juried exhibition held as part of ArtSpan's Annual Art Bridge Gala. Two A Colorful History works were shown: Lombard Street . 1922 v2, a newly repainted version made specifically for this exhibition (distinct from an earlier original of the same subject), and Baker Beach . 1935. The Lombard Street repaint sold that evening for $800 and led to a follow-up commission. Looking back, this show marked the height of the San Francisco run of A Colorful History — the point at which continuing to build a career in the city would have meant pushing that one series harder than Bernard wanted to, at a moment when he still wanted to experiment. That tension was part of what led to the move to Berlin shortly after."

  const artspanArtistNote =
    'Nice evening, met some good people in the art world. Showed the Lombard Street repaint and Baker Beach together. Sold the Lombard Street piece for $800 and got commissioned for another one off the back of it. This was the height of my SF run with A Colorful History — San Francisco cost too much to keep just doing that series to survive there, and I still wanted to experiment, which is part of what pushed me toward Berlin.'

  const artspan = await upsertEvent(payload, ARTSPAN_SLUG, ARTSPAN_SLUG_ALIASES, {
    title: 'ArtSpan Selections 2017 Juried Exhibition',
    eventType: 'group-exhibition',
    status: 'published',
    featured: true,
    startDate: '2017-01-01',
    yearStart: 2017,
    isOngoing: false,
    venueName: 'Heron Arts',
    venueCity: 'San Francisco',
    venueCountry: 'United States',
    // Required for enrichmentStatus:complete; Heron Arts public address.
    venueAddress: '7 Heron St, San Francisco, CA 94103',
    sameAs: [{ uri: 'http://guide.artspan.org/gala/' }],
    pressUrl: 'http://guide.artspan.org/gala/',
    coExhibitors: coExhibitorRows,
    jurors: jurorRows,
    artworkPresentationNote: artspanPresentationNote,
    descriptionShort:
      'Selected artist, ArtSpan Selections 2017 Juried Exhibition, part of the Annual Art Bridge Gala at Heron Arts, San Francisco.',
    descriptionLong: plainToLexical(artspanDescriptionLong),
    artistNote: artspanArtistNote,
    practiceArcNote:
      "The peak of the San Francisco chapter of A Colorful History, and a marker of full embeddedness in the city's co-op/gallery ecosystem (City Art Gallery, Open Studios, ArtSpan membership). Sitting right at this height made the fork clear: staying in San Francisco would have meant leaning harder into this one series than felt right, at a point when broader experimentation was still the goal. That tension contributed directly to the decision to relocate to Berlin.",
    conceptualKeywords: [
      { keyword: 'co-op gallery scene' },
      { keyword: 'juried selection' },
      { keyword: 'A Colorful History' },
      { keyword: 'career inflection point' },
    ],
    eventTypeCustom: null,
    excludeFromCv: false,
    cvSection: 'group-exhibitions',
    cvPriority: 7,
    artworks,
  })
  console.log(
    `✓ ArtSpan event ${artspan.created ? 'created' : 'updated'}: id=${artspan.id} /events/${ARTSPAN_SLUG}` +
      (artspan.previousSlug ? ` (was ${artspan.previousSlug})` : ''),
  )

  for (const [label, id] of [
    ['Mediamatic', mediamatic.id],
    ['ArtSpan', artspan.id],
  ] as const) {
    const doc = await payload.findByID({
      collection: 'events',
      id,
      depth: 0,
      overrideAccess: true,
    })
    console.log(
      `  ${label}: enrichmentStatus=${doc.enrichmentStatus} hasPage=${doc.hasPage} featured=${doc.featured} jurors=${doc.jurors?.length ?? 0} otherParticipants=${doc.otherParticipants?.length ?? 0} coExhibitors=${doc.coExhibitors?.length ?? 0} artworks=${doc.artworks?.length ?? 0}`,
    )
  }

  // --- Sessions (Part 6 — full verbatim transcripts) ---
  const mediamaticSession = await upsertEventSession(payload, {
    sessionId: MEDIAMATIC_SESSION_ID,
    eventId: mediamatic.id,
    artistId: artist.id,
    messages: MEDIAMATIC_MESSAGES,
    agentModel: 'claude-sonnet-5',
    sessionNotes: MEDIAMATIC_SESSION_NOTES,
    dialogueRefinementFlag: true,
    refinementNotes: MEDIAMATIC_REFINEMENT_NOTES,
    fieldUpdateTimeline: [
      {
        field: 'coExhibitors',
        value: 'Rik (djembe)',
        confidence: 'artist-confirmed',
        source: 'dialogue',
        timestamp: '2026-07-31T16:20:00.000Z',
      },
      {
        field: 'descriptionLong',
        value: 'see Mediamatic Event descriptionLong',
        confidence: 'artist-confirmed',
        source: 'dialogue',
        timestamp: SESSION_COMPLETED_AT,
      },
      {
        field: 'artistNote',
        value: 'see Mediamatic Event artistNote',
        confidence: 'artist-confirmed',
        source: 'dialogue',
        timestamp: SESSION_COMPLETED_AT,
      },
      {
        field: 'practiceArcNote',
        value: 'see Mediamatic Event practiceArcNote',
        confidence: 'artist-confirmed',
        source: 'dialogue',
        timestamp: '2026-07-31T17:40:00.000Z',
      },
    ],
  })
  console.log(
    `✓ Mediamatic session ${mediamaticSession.created ? 'created' : 'updated'}: id=${mediamaticSession.id} sessionId=${MEDIAMATIC_SESSION_ID}`,
  )

  const artspanSession = await upsertEventSession(payload, {
    sessionId: ARTSPAN_SESSION_ID,
    eventId: artspan.id,
    artistId: artist.id,
    messages: ARTSPAN_MESSAGES,
    agentModel: 'claude-sonnet-5',
    sessionNotes: ARTSPAN_SESSION_NOTES,
    dialogueRefinementFlag: false,
    refinementNotes: null,
    fieldUpdateTimeline: [
      {
        field: 'artworkPresentationNote',
        value:
          'Lombard Street . 1922 v2 (repainted for show) + Baker Beach . 1935 — catalogue-corrected from spoken "1925"',
        confidence: 'artist-confirmed',
        source: 'dialogue',
        timestamp: '2026-07-31T17:10:00.000Z',
      },
      {
        field: 'descriptionLong',
        value: 'see ArtSpan Event descriptionLong',
        confidence: 'artist-confirmed',
        source: 'dialogue',
        timestamp: SESSION_COMPLETED_AT,
      },
      {
        field: 'artistNote',
        value: 'see ArtSpan Event artistNote',
        confidence: 'artist-confirmed',
        source: 'dialogue',
        timestamp: SESSION_COMPLETED_AT,
      },
      {
        field: 'practiceArcNote',
        value: 'see ArtSpan Event practiceArcNote',
        confidence: 'artist-confirmed',
        source: 'dialogue',
        timestamp: '2026-07-31T17:50:00.000Z',
      },
    ],
  })
  console.log(
    `✓ ArtSpan session ${artspanSession.created ? 'created' : 'updated'}: id=${artspanSession.id} sessionId=${ARTSPAN_SESSION_ID}`,
  )

  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

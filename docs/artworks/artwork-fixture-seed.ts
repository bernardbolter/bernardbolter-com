/**
 * Artwork Fixture Seed — Styling Reference
 * =========================================
 * This file creates a single draft artwork record with every field populated.
 * Purpose: provide a complete styling target for the artwork page before
 * real Art/Official-catalogued records exist.
 *
 * IMPORTANT:
 * - status is always 'draft' — this record must never be published
 * - slug is '__fixture-gates-iii' — prefixed with __ to make it unmistakeable
 * - The UI should not allow publishing any record with a slug beginning with __
 * - This record does not represent a real artwork in the archive
 *
 * Run with: npx payload run src/seed/artworkFixture.ts
 */

import payload from 'payload'
import config from '../payload.config'

async function seed() {
  await payload.init({ config })

  // Resolve relation IDs — these must exist before running this seed.
  // Create them manually in the Payload admin first if they don't exist.
  // The fixture assumes the following records exist:
  //   Series: "A Colorful History" with slug "a-colorful-history"
  //   Tags: see tag arrays below — create any missing tags first

  const series = await payload.find({
    collection: 'series',
    where: { slug: { equals: 'a-colorful-history' } },
    limit: 1,
  })

  if (!series.docs.length) {
    throw new Error(
      'Series "a-colorful-history" not found. Create it in the admin before running this seed.'
    )
  }

  const seriesId = series.docs[0].id

  // Resolve or create tags
  const tagDefs = [
    { label: 'Post-internet', type: 'movement' },
    { label: 'Contemporary', type: 'period' },
    { label: 'Abstraction', type: 'style' },
    { label: 'Photography', type: 'style' },
    { label: 'Collage', type: 'style' },
    { label: 'Memory', type: 'subject' },
    { label: 'Erasure', type: 'subject' },
    { label: 'Archive', type: 'subject' },
    { label: 'Painting', type: 'genre' },
  ]

  const tagIds: Record<string, string> = {}
  for (const def of tagDefs) {
    const existing = await payload.find({
      collection: 'tags',
      where: { label: { equals: def.label } },
      limit: 1,
    })
    if (existing.docs.length) {
      tagIds[def.label] = existing.docs[0].id
    } else {
      const created = await payload.create({
        collection: 'tags',
        data: { label: def.label, type: def.type },
      })
      tagIds[def.label] = created.id
    }
  }

  // Resolve or create art historical references
  const refDefs = [
    {
      artworkTitle: 'Retroactive I',
      artistName: 'Robert Rauschenberg',
      yearCreated: 1964,
      medium: 'Oil and silkscreen ink on canvas',
      institution: 'Wadsworth Atheneum Museum of Art',
      referenceUrl: 'https://www.wikidata.org/wiki/Q27987985',
      notes:
        'The photographic layer present but never fully legible — the transfer logic is the same, but here the painted field explicitly interrupts rather than integrates. Rauschenberg's transfer work is the clearest precedent for treating the photograph as a surface to be worked against rather than a subject to be reproduced.',
    },
    {
      artworkTitle: 'Photo Paintings (Fotobilder)',
      artistName: 'Gerhard Richter',
      yearCreated: 1964,
      medium: 'Oil on canvas',
      institution: 'Various',
      referenceUrl: 'https://www.gerhard-richter.com/en/art/paintings/photo-paintings',
      notes:
        'The blur in Richter's photo paintings comes from the brush; in the Gates work it comes from the act of transfer itself, which produces a similar conditional legibility. Both use the photograph as a starting point while refusing to let it be simply a record.',
    },
  ]

  const refIds: string[] = []
  for (const ref of refDefs) {
    const existing = await payload.find({
      collection: 'artHistoricalReferences',
      where: { artworkTitle: { equals: ref.artworkTitle } },
      limit: 1,
    })
    if (existing.docs.length) {
      refIds.push(existing.docs[0].id)
    } else {
      const created = await payload.create({
        collection: 'artHistoricalReferences',
        data: ref,
      })
      refIds.push(created.id)
    }
  }

  // Resolve or create a fixture event
  let eventId: string | null = null
  const existingEvent = await payload.find({
    collection: 'events',
    where: { slug: { equals: '__fixture-signals-noise' } },
    limit: 1,
  })
  if (existingEvent.docs.length) {
    eventId = existingEvent.docs[0].id
  } else {
    const createdEvent = await payload.create({
      collection: 'events',
      data: {
        title: 'Signals & Noise',
        slug: '__fixture-signals-noise',
        eventType: 'group-exhibition',
        status: 'draft',
        startDate: '2022-09-10',
        endDate: '2022-11-20',
        venueName: 'Galerie Nord',
        city: 'Berlin',
        country: 'Germany',
        description: 'Fixture event for styling purposes. Not a real exhibition.',
      },
    })
    eventId = createdEvent.id
  }

  // Upsert the fixture artwork
  const existing = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: '__fixture-gates-iii' } },
    limit: 1,
  })

  const fixtureData = {
    // --- Identity ---
    title: 'Gates of Perception III',
    altTitle: 'Tore der Wahrnehmung III',
    slug: '__fixture-gates-iii',
    status: 'draft' as const,
    yearCreated: 2019,
    yearCompleted: 2019,
    recordOrigin: 'artist-catalogued' as const,
    catalogueNumber: 'BB-ACH-2019-003',

    // --- Medium and support ---
    medium: 'acrylic photo transfer on canvas',
    support: 'canvas',
    framing: 'unframed',
    measurementType: ['physical'],
    weight: 4.2,
    materialAndProcessMeaning:
      'The photo transfer process matters because it keeps the photographic layer conditional — present but contingent, always on the verge of disappearing. Acrylic works against the transfer rather than with it. The tension between the two materials is not incidental to the work; it is the work.',

    // --- Physical dimensions ---
    widthWhole: 90,
    widthFraction: '',
    heightWhole: 120,
    heightFraction: '',
    dimensionUnit: 'cm',
    widthMm: 900,
    heightMm: 1200,
    depthMm: 20,
    aspectRatio: 0.75,

    // --- Size and orientation ---
    sizeTier: 'lg' as const,
    orientation: 'portrait' as const,

    // --- Classification ---
    series: seriesId,
    city: 'Berlin',
    country: 'Germany',
    cityTgnUri: 'http://vocab.getty.edu/tgn/7003712',
    movementTags: [tagIds['Post-internet']],
    styleTags: [tagIds['Abstraction'], tagIds['Photography'], tagIds['Collage']],
    subjectTags: [tagIds['Memory'], tagIds['Erasure'], tagIds['Archive']],
    genreTags: [tagIds['Painting']],
    periodTags: [tagIds['Contemporary']],
    conceptualKeywords: ['mediation', 'erasure', 'threshold', 'accumulation', 'the photographic index'],
    artHistoricalReferences: refIds,
    artHistoricalContext:
      'This work sits most directly in dialogue with Rauschenberg's transfer works of the early 1960s, where the photographic layer was treated as a surface to be interrupted rather than a subject to be reproduced. The conditional legibility it shares with Richter's photo paintings is produced differently — through the transfer process itself rather than through the brush — but the epistemological position is similar: the photograph is allowed to be present only partially, only provisionally.',
    seriesContext:
      'This is the third work in the Gates of Perception sub-series and the point where the restraint logic becomes explicit. In the first two works, the painted field was expansive — it washed across the transfer. Here it contracts. The field becomes a pressure rather than a flood. In retrospect this is the hinge point of the whole sub-series: the works before it were building toward this contraction, and the works after are working out what it means.',
    consciousRejections:
      'The work was made against the idea that the photograph in painting is a surface to be illustrated — that the role of the paint is to explain or decorate the image beneath it. It was also made against the legibility of the photographic image as such: the transfer process is chosen precisely because it refuses to give you the photograph cleanly. If you want the image clearly, you would print it.',
    formalContributionAssessment:
      'The specific contribution here is using the material failure of the transfer process — the conditional legibility it produces — as a formal statement about the nature of photographic memory rather than as an imperfection to be corrected. Earlier work using photo transfer had treated the partial legibility as an effect. This work treats it as the argument.',
    sourceMaterials:
      'A photograph found at a flea market in Prenzlauer Berg, Berlin, c. 2018. The face of the subject was almost entirely faded — a silhouette against a bright window. The photograph appeared to be from the 1950s or early 1960s; the subject unidentified.',
    events: eventId ? [eventId] : [],

    // --- Media ---
    primaryMediaType: 'image' as const,
    // primaryImage would reference an uploaded image ID — left null for fixture
    primaryImageAltText: 'Gates of Perception III — acrylic photo transfer on canvas, 90 × 120 cm, 2019. A photographic transfer of an unidentified figure is interrupted by a contained field of pale acrylic paint sitting tightly against the left edge of the image.',

    // alternateViewImages, detailImages, installationShots — arrays; left empty for fixture
    // documentationVideoUrl — external URL; populate manually to test video card
    documentationVideoUrl: 'https://vimeo.com/000000000', // placeholder — replace with real URL

    // --- Intent fields ---
    intent:
      'I was thinking about how photographs don\'t actually hold memory — they replace it. Every time you look at a photograph you look at it instead of remembering; the image substitutes for the experience it claims to document. The paint is the resistance to that replacement. It doesn\'t explain the photograph or decorate it. It interrupts it. The tension between the two is the work — the photograph trying to be a record, the paint refusing to let it settle.',
    intentVsOutcome:
      'I expected the restraint to feel like discipline — like the paint was being held back. It ended up feeling like pressure. The small field of paint against the edge of the transfer reads more like a force than an absence. That wasn\'t planned. The work became about compression where I thought it was going to be about restraint. I think that\'s actually truer to what was happening at that point in the series.',
    makingNote:
      'The transfer was made first — a single pass, relatively clean compared to earlier Gates works. Then I left it for several days before introducing the paint. The delay was intentional: I wanted to see the transfer on its own terms before deciding what the paint would do. The field arrived quickly once I started — two or three decisions in an afternoon. The position tight against the left edge was the third thing I tried. The first two positions were too central, too much like a response to the figure. The edge position makes it structural.',
    directInspiration:
      'The faded photograph from the Prenzlauer Berg flea market. The face was almost entirely gone — just the outline of a head against a bright window. I kept coming back to the idea that the photograph was more honest about memory when it was failing than when it was clear.',
    encounterNote:
      'Made in the studio in Neukölln in late autumn 2019. It was a quiet period — I had just finished the second Gates work and wasn\'t sure whether to continue the sub-series or let it resolve at two. The photograph from the market had been sitting on the studio wall for three months. At some point it became clear that the series hadn\'t resolved; it had paused.',
    workContext:
      'This was made during a period when the broader A Colorful History work was moving toward more complex painted fields — multiple colours, more gestural application. The Gates sub-series was running counter to that: more restrained, more focused on the specific relationship between the transferred photograph and a single constrained painted element. The two tracks were in productive tension through this period.',
    processNotes:
      'Image analysis shows a single contained rectangular painted field occupying approximately 15% of the image area, positioned tightly against the left vertical edge and extending roughly two-thirds of the image height. The transfer beneath shows low-contrast figure-ground separation consistent with a degraded original photograph or an intentionally overexposed source image. The boundary between the painted field and the transfer is clean — no visible bleed — suggesting the paint was applied after the transfer was fully dry.',

    // --- Agent analysis fields ---
    descriptionShort:
      'A partially legible photographic transfer is held in tension with a contained field of pale acrylic paint. The photograph — the silhouette of an unidentified figure against a bright window — is present but never fully resolved. The paint does not illustrate or explain the image; it interrupts it.',
    descriptionLong: {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'Gates of Perception III is the third work in the Gates of Perception sub-series within A Colorful History, and the hinge point of the series. The works before it were building toward the restraint visible here; the works after are working out what that restraint means.',
              },
            ],
          },
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'A photographic transfer — sourced from a faded found photograph of an unidentified figure — is interrupted by a single contained field of pale acrylic. The transfer is deliberately partial: the figure is present as a silhouette, the facial detail absent. The paint does not respond to the figure. It occupies the left edge of the image as a structural pressure rather than a gesture.',
              },
            ],
          },
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'The work sits in dialogue with Rauschenberg\'s transfer works of the early 1960s and with Richter\'s photo paintings, but the formal argument is distinct: here the conditional legibility produced by the transfer process is not a side effect but the subject. The photograph is chosen because it is failing. The paint reinforces the failure rather than compensating for it.',
              },
            ],
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    },
    dominantColours: ['#c8b89a', '#8B6F4E', '#f0ece4', '#3a3028', '#d4c4b0'],

    // --- Commercial fields ---
    availabilityStatus: 'available' as const,
    editionType: 'unique' as const,
    editions: [
      {
        formatLabel: 'Small giclée',
        widthCm: 40,
        heightCm: 53,
        substrate: 'Hahnemühle Photo Rag 308gsm',
        printTechnique: 'Giclée',
        totalEditionSize: 10,
        artistProofs: 2,
        remaining: 7,
        pricePerPrint: 280,
        currency: 'EUR',
        certificate: true,
        signature: true,
        notes: 'Signed and numbered recto. Certificate of authenticity included.',
      },
      {
        formatLabel: 'Medium giclée',
        widthCm: 60,
        heightCm: 80,
        substrate: 'Hahnemühle Photo Rag 308gsm',
        printTechnique: 'Giclée',
        totalEditionSize: 10,
        artistProofs: 2,
        remaining: 4,
        pricePerPrint: 480,
        currency: 'EUR',
        certificate: true,
        signature: true,
        notes: 'Signed and numbered recto. Certificate of authenticity included.',
      },
      {
        formatLabel: 'Large giclée',
        widthCm: 75,
        heightCm: 100,
        substrate: 'Hahnemühle Photo Rag 308gsm',
        printTechnique: 'Giclée',
        totalEditionSize: 5,
        artistProofs: 1,
        remaining: 2,
        pricePerPrint: 780,
        currency: 'EUR',
        certificate: true,
        signature: true,
        notes: 'Signed and numbered recto. Certificate of authenticity included. Large format shipping on request.',
      },
    ],
    editionNotes:
      'All giclée editions are printed to order on Hahnemühle Photo Rag archival paper. Each print is signed and numbered by the artist and includes a certificate of authenticity. No open editions will be produced.',

    // --- Provenance and location ---
    // Note: private fields (ownershipHistory, loanHistory, provenanceConfidenceLayer)
    // are not seeded here — they are visible only in the admin and never in public API responses.
    workState: 'original' as const,
    workStateDate: '2024-01-15',
    stateVersions: [],
    provenanceOriginKnown: true,

    // --- Schema.org / JSON-LD fields ---
    sameAs: [
      'https://www.artsy.net/artwork/bernard-bolter-gates-of-perception-iii',
    ],
    license: 'https://rightsstatements.org/vocab/InC/1.0/',
    creditText: 'Bernard Bolter, Gates of Perception III, 2019. Courtesy the artist.',

    // --- AR fields ---
    arEnabled: true,
    arAllowScaling: false,
    // arModelUrl and arModelGlbUrl populated by background job when arEnabled: true

    // --- System fields ---
    reasoningStatus: 'complete' as const,
    // clipEmbedding: not seeded — generated by afterChange hook from real image
  }

  if (existing.docs.length) {
    await payload.update({
      collection: 'artworks',
      id: existing.docs[0].id,
      data: fixtureData,
    })
    console.log('✓ Fixture artwork updated:', existing.docs[0].id)
  } else {
    const created = await payload.create({
      collection: 'artworks',
      data: fixtureData,
    })
    console.log('✓ Fixture artwork created:', created.id)
  }

  console.log('\nFixture seed complete.')
  console.log('Slug: __fixture-gates-iii')
  console.log('Status: draft — do not publish')
  console.log('\nTo view: start the dev server and navigate to /admin/collections/artworks')
  console.log('The record will appear in the list with slug __fixture-gates-iii')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Fixture seed failed:', err)
  process.exit(1)
})

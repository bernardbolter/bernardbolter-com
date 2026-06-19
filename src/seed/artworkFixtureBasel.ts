/**
 * Artwork Fixture Seed — Basel Switzerland (DCS)
 * ===============================================
 * Draft record __fixture-basel-dcs for testing the right-column layout.
 * Uses the same tags as __fixture-gates-iii so they are guaranteed to exist.
 *
 * Run with: npx tsx src/seed/artworkFixtureBasel.ts
 *
 * Prerequisites:
 *   Run artworkFixture.ts first (creates tags and events this seed reuses)
 *   Series: "Digital City Series" with slug "digital-city-series" must exist
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const BASEL_SLUG = '__fixture-basel-dcs' as const

// Exact same tags as artworkFixture.ts — guaranteed to exist after that seed runs
const TAG_DEFS = [
  { label: 'Post-internet', type: 'movement' as const },
  { label: 'Contemporary',  type: 'period'   as const },
  { label: 'Abstraction',   type: 'style'    as const },
  { label: 'Photography',   type: 'style'    as const },
  { label: 'Collage',       type: 'style'    as const },
  { label: 'Memory',        type: 'subject'  as const },
  { label: 'Erasure',       type: 'subject'  as const },
  { label: 'Archive',       type: 'subject'  as const },
  { label: 'Painting',      type: 'genre'    as const },
]

async function seed() {
  const payload = await getPayload({ config })

  // --- Series ---
  const seriesResult = await payload.find({
    collection: 'series',
    where: { slug: { equals: 'digital-city-series' } },
    limit: 1,
    overrideAccess: true,
  })
  if (!seriesResult.docs[0]) {
    throw new Error('Series "digital-city-series" not found. Create it in the admin first.')
  }
  const seriesId = seriesResult.docs[0].id

  // --- Creator ---
  const artistResult = await payload.find({
    collection: 'artists',
    limit: 1,
    overrideAccess: true,
  })
  if (!artistResult.docs[0]) {
    throw new Error('No artist record found.')
  }
  const creatorId = artistResult.docs[0].id

  // --- Tags (reuse existing, same labels as Gates III) ---
  const tagIds: Record<string, number> = {}
  for (const def of TAG_DEFS) {
    const existing = await payload.find({
      collection: 'tags',
      where: { label: { equals: def.label } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      tagIds[def.label] = existing.docs[0].id
    } else {
      const created = await payload.create({
        collection: 'tags',
        data: { label: def.label, type: def.type },
        overrideAccess: true,
      })
      tagIds[def.label] = created.id
    }
  }

  // --- Events ---
  // Event 1: hasPage true — tests linked exhibition row
  const event1Slug = '__fixture-dcs-rietveld-2009'
  let event1Id: number
  const existingEvent1 = await payload.find({
    collection: 'events',
    where: { slug: { equals: event1Slug } },
    limit: 1,
    overrideAccess: true,
  })
  if (existingEvent1.docs[0]) {
    event1Id = existingEvent1.docs[0].id
  } else {
    const created = await payload.create({
      collection: 'events',
      data: {
        title: 'Digital City Series — Rietveld Graduation Show',
        slug: event1Slug,
        eventType: 'group-exhibition' as const,
        status: 'draft' as const,
        startDate: '2009-06-12',
        endDate: '2009-06-22',
        venueName: 'Gerrit Rietveld Academie',
        venueCity: 'Amsterdam',
        venueCountry: 'Netherlands',
        hasPage: true,
        descriptionShort: 'Fixture event. First public showing of the Digital City Series.',
        enrichmentStatus: 'complete' as const,
      },
      overrideAccess: true,
      context: { skipEmbedding: true },
    })
    event1Id = created.id
  }

  // Event 2: hasPage false — tests plain text exhibition row
  const event2Slug = '__fixture-dcs-dafen-2010'
  let event2Id: number
  const existingEvent2 = await payload.find({
    collection: 'events',
    where: { slug: { equals: event2Slug } },
    limit: 1,
    overrideAccess: true,
  })
  if (existingEvent2.docs[0]) {
    event2Id = existingEvent2.docs[0].id
  } else {
    const created = await payload.create({
      collection: 'events',
      data: {
        title: 'Art Collision — Dafen Village',
        slug: event2Slug,
        eventType: 'residency' as const,
        status: 'draft' as const,
        startDate: '2010-03-01',
        endDate: '2010-04-30',
        venueName: 'Dafen Oil Painting Village',
        venueCity: 'Shenzhen',
        venueCountry: 'China',
        hasPage: false,
        descriptionShort: 'Fixture event. DCS oil painting collaboration residency.',
        enrichmentStatus: 'complete' as const,
      },
      overrideAccess: true,
      context: { skipEmbedding: true },
    })
    event2Id = created.id
  }

  // --- Artwork ---
  const existingArtwork = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: BASEL_SLUG } },
    limit: 1,
    overrideAccess: true,
  })

  const fixtureData = {
    title: 'Basel Switzerland',
    altTitle: 'Basel, Schweiz',
    slug: BASEL_SLUG,
    status: 'draft' as const,
    yearCreated: 2007,
    yearCompleted: 2007,
    recordOrigin: 'artist-catalogued' as const,
    catalogueNumber: 'BB-DCS-2007-001',
    catalogueSequence: 1,
    creator: creatorId,
    series: seriesId,

    // Medium
    medium: 'photo-collage',
    support: 'board',
    framing: 'unframed',
    measurementType: ['digital'] as ['digital'],
    widthWhole: 121,
    heightWhole: 121,
    dimensionUnit: 'cm',
    widthMm: 1210,
    heightMm: 1210,
    widthPx: 10000,
    heightPx: 10000,
    aspectRatio: 1,
    sizeTier: 'xl' as const,
    orientation: 'square' as const,

    // Location created — Basel, Switzerland (country shows since not Germany)
    locationCreated: {
      label: 'Captured in Basel; assembled in Amsterdam',
      city: 'Basel',
      country: 'Switzerland',
      countryCode: 'CH',
      lat: 47.5596,
      lng: 7.5886,
    },

    // Classification — reusing Gates III tags
    movementTags: [tagIds['Post-internet']!],
    styleTags:    [tagIds['Abstraction']!, tagIds['Collage']!],
    subjectTags:  [tagIds['Memory']!, tagIds['Archive']!],
    genreTags:    [tagIds['Painting']!],
    periodTags:   [tagIds['Contemporary']!],
    conceptualKeywords: [
      { keyword: 'skateboard capture' },
      { keyword: 'seamless collage' },
      { keyword: 'street-level view' },
      { keyword: 'the square format' },
      { keyword: 'document rather than spectacle' },
    ],

    artHistoricalContext:
      "Basel Switzerland sits in the New Topographics lineage — the tradition of treating the built environment without symbolic loading. The closer precedent is Frank's The Americans — movement through a city as the generative method, the body's path as the selection logic.",
    seriesContext:
      'Basel Switzerland is the founding work of the Digital City Series — the first complete DCS composition. The series logic only became legible retrospectively. Basel is where the series becomes possible.',
    consciousRejections:
      'Made against the visually impressive digital collage getting into galleries at the time. The DCS was a deliberate move toward seamlessness and believability — a document rather than a spectacle.',
    formalContributionAssessment:
      'Basel Switzerland establishes the formal and conceptual DNA of the Digital City Series: the square format as a refusal of the portrait/landscape binary, seamlessness as a condition of believability rather than spectacle, and the skateboard ride as the generative act behind the compositions.',
    sourceMaterials:
      "Four panoramic scenes captured on skateboard across Basel's Altstadt, hand-stitched in Photoshop into a single 48×48 inch square composition.",

    events: [event1Id, event2Id],

    primaryImageAltText:
      "Basel Switzerland, 2007. A seamless square collage of four skateboard-captured panoramic scenes from Basel's Altstadt, printed on aluminium, 48 × 48 inches.",
    documentationVideoUrl: 'https://vimeo.com/000000002',

    intent:
      'The square format was chosen because the work functions simultaneously as a portrait and a landscape. The skateboard is the instrument of perception; the composition is what that movement produces.',
    intentVsOutcome:
      'Basel holds up less well technically than later works — the methodology was still developing. But the simplicity also gives it a timeless quality. The first work carries the DNA of the series before the process was fully resolved.',
    makingNote:
      "The skateboard was initially just the practical means of getting around the city. The understanding that the skateboard ride was what the work was actually about came later, as the series developed.",
    directInspiration:
      "The Basel work had been planned before the Rietveld school trip provided the opportunity. The school's initial negative reception helped sharpen the thinking.",
    encounterNote:
      'The work feels early and raw — but the conclusion is unambiguous: it is the foundation of the Digital City Series, not an experiment.',
    workContext:
      'Made during a Gerrit Rietveld Akademie school trip to Basel, 2007. First exhibited at the Rietveld before the Christmas break, printed on A3 sheets.',
    processNotes:
      'All hand-stitched in Photoshop — no automation except possibly the sky. Shot at 18mm, which introduced fisheye distortion.',
    materialAndProcessMeaning:
      'Printed on aluminium — the only viable large-format support given the resolution and scale requirements. The high cost of aluminium printing at scale was a structural constraint that ultimately contributed to the series pausing.',

    descriptionShort:
      "A seamless digital composite of Basel, Switzerland: four scenes captured on skateboard across the city's Altstadt and hand-stitched into a single 48×48 inch square composition, printed on aluminium.",
    descriptionLong: {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            version: 1,
            children: [{ type: 'text', version: 1,
              text: 'Basel Switzerland is the founding work of the Digital City Series — the first complete DCS composition. The series logic only became legible retrospectively. Basel is where the series becomes possible.' }],
            direction: 'ltr', format: '', indent: 0,
          },
          {
            type: 'paragraph',
            version: 1,
            children: [{ type: 'text', version: 1,
              text: "Four panoramic scenes were captured on skateboard across the city's Altstadt and hand-stitched in Photoshop into a single square composition. The square format refuses both portrait and landscape — or rather, refuses to choose." }],
            direction: 'ltr', format: '', indent: 0,
          },
        ],
        direction: 'ltr', format: '', indent: 0, version: 1,
      },
    },

    dominantColors: [
      { hex: '#7a6a4a' },
      { hex: '#4a5a3a' },
      { hex: '#8a7a5a' },
      { hex: '#2a3a2a' },
      { hex: '#6a5a3a' },
    ],

    // --- Right column test data ---

    availabilityStatus: 'not-for-sale' as const,
    hasEditions: 'limited' as const,

    // Private collection → tests confirmed-owner headline
    currentLocation: {
      category: 'private-collection',
      locationDetail: 'Private collection, Zurich',
    },

    // Mixed confidence → "Provenance: partially documented."
    provenanceOriginKnown: true,
    provenanceConfidenceLayer: [
      {
        claim: 'Work created during Rietveld school trip to Basel, 2007',
        evidenceBasis: 'Artist catalogue record and school trip documentation',
        confidenceLevel: 'documented-fact',
      },
      {
        claim: 'Acquired by current owner c. 2012',
        evidenceBasis: 'Direct communication with owner',
        confidenceLevel: 'credible-inference',
      },
      {
        claim: '1/3 exhibited at Kunsthalle Basel, 2015',
        evidenceBasis: 'Institution loan record',
        confidenceLevel: 'institutional-assertion',
      },
    ],

    // Confirmed visible owner → unclaimed appeal does NOT show
    ownershipHistory: [
      {
        ownerPrivate: 'fixture-redacted',
        displayName: 'Private collection, Zurich',
        city: 'Zurich',
        dateAcquired: '2012-03',
        collectorVisible: true,
        claimStatus: 'claimed-confirmed',
      },
    ],

    // Loan history → tests loan section renders
    loanHistory: [
      {
        institution: 'Kunsthalle Basel',
        dateOut: '2015-04-01',
        dateReturned: '2015-07-15',
        eventId: null,
      },
    ],

    // Edition tiers + ownership on dcs.editionTiers[] (per print-data-architecture-reference.md)
    dcs: {
      editionTiers: [
        {
          tierName: 'monumental',
          totalEditionSize: 3,
          printSubstrate: 'aluminum-mount',
          includesSupportingPrints: true,
          isOriginalTier: true,
          copies: [
            {
              copyNumber: '1/3',
              isArtistProof: false,
              owner: 'Private collection, Berlin',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2023-09-15',
              claimedCopyNumberKnown: true,
            },
            {
              copyNumber: 'AP',
              isArtistProof: true,
              owner: null,
              claimStatus: 'artist-held',
              collectorVisible: false,
              claimedCopyNumberKnown: false,
            },
          ],
        },
        {
          tierName: 'collectors-print',
          totalEditionSize: 9,
          printSubstrate: 'aluminum-mount',
          includesSupportingPrints: true,
          copies: [
            {
              copyNumber: '2/9',
              isArtistProof: false,
              owner: 'K. Müller',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2023-11-01',
              claimedCopyNumberKnown: true,
            },
            {
              copyNumber: '4/9',
              isArtistProof: false,
              owner: 'Private collection, London',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2024-01-15',
              claimedCopyNumberKnown: true,
            },
            {
              copyNumber: '7/9',
              isArtistProof: false,
              owner: 'Private collection',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2024-03-01',
              claimedCopyNumberKnown: false,
            },
            {
              copyNumber: '9/9',
              isArtistProof: false,
              owner: 'Private collection, Amsterdam',
              claimStatus: 'claimed-confirmed',
              collectorVisible: true,
              dateAcquired: '2024-06-01',
              claimedCopyNumberKnown: true,
            },
            {
              copyNumber: 'AP 1/2',
              isArtistProof: true,
              owner: null,
              claimStatus: 'artist-held',
              collectorVisible: false,
              claimedCopyNumberKnown: false,
            },
            {
              copyNumber: 'AP 2/2',
              isArtistProof: true,
              owner: null,
              claimStatus: 'artist-held',
              collectorVisible: false,
              claimedCopyNumberKnown: false,
            },
          ],
        },
        {
          tierName: 'small-print',
          totalEditionSize: 200,
          printSubstrate: 'paper',
          includesSupportingPrints: true,
          copies: [],
        },
      ],
    },

    ownershipRegistry: [],

    untrackedEditionsNote:
      'Small A3 prints were sold informally at the Rietveld graduation show in 2009. Not consistently numbered; not individually tracked.',

    sameAsUrls: [
      { url: 'https://www.artsy.net/artwork/bernard-bolter-basel-switzerland' },
    ],
    sameAs: [
      {
        url: 'https://www.artsy.net/artwork/bernard-bolter-basel-switzerland',
        label: 'Artsy',
      },
    ],

    license: 'all-rights-reserved',
    creditText: 'Bernard Bolter, Basel Switzerland, 2007. Courtesy the artist.',
    arEnabled: false,
    reasoningStatus: 'complete' as const,
  }

  let artworkId: number
  if (existingArtwork.docs[0]) {
    const updated = await payload.update({
      collection: 'artworks',
      id: existingArtwork.docs[0].id,
      data: fixtureData,
      overrideAccess: true,
      context: { skipEmbedding: true },
    })
    artworkId = updated.id
    console.log('✓ Basel fixture updated:', artworkId)
  } else {
    const created = await payload.create({
      collection: 'artworks',
      data: fixtureData,
      overrideAccess: true,
      context: { skipEmbedding: true },
    })
    artworkId = created.id
    console.log('✓ Basel fixture created:', artworkId)
  }

  // Link loan history event reference separately if needed
  console.log('\n✓ Basel DCS fixture seed complete.')
  console.log(`Slug: ${BASEL_SLUG}`)
  console.log('Dev page: /preview/artwork/__fixture-basel-dcs')
  console.log('\nRight column tests:')
  console.log('  Layer1:     Made in Basel, Switzerland')
  console.log('  Status:     Private collection, Zurich')
  console.log('  Provenance: Partially documented')
  console.log('  Ownership:  1 visible entry — no unclaimed appeal')
  console.log('  Docs:       Vimeo link, no AR line')
  console.log('  Loan hist:  Kunsthalle Basel 2015')
  console.log('  Ext links:  Artsy')
  console.log('  Registry T1 (Original 3+1AP):   1/3 claimed, AP suppressed')
  console.log('  Registry T2 (Collectors 9+2AP): 4/9 claimed, APs suppressed')
  console.log('  Registry T3 (Small print 200):  0/200 — available')
  console.log('  Exhibition: Rietveld 2009 (linked), Dafen 2010 (plain text)')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Basel fixture seed failed:', err)
    process.exit(1)
  })

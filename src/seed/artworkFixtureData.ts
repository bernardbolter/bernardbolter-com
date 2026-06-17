import type { Artwork } from '@/payload-types'

export const ARTWORK_FIXTURE_SLUG = '__fixture-gates-iii' as const
export const ARTWORK_FIXTURE_EVENT_SLUG = '__fixture-signals-noise' as const

export type ArtworkFixtureRelations = {
  seriesId: number
  creatorId: number
  tagIds: Record<string, number>
  artHistoricalReferenceIds: number[]
}

/** Public fixture copy — draft styling target per artwork-page-directive.md */
export function buildArtworkFixtureData(
  relations: ArtworkFixtureRelations,
): Omit<Artwork, 'id' | 'updatedAt' | 'createdAt'> {
  const { seriesId, creatorId, tagIds, artHistoricalReferenceIds } = relations

  return {
    title: 'Gates of Perception III',
    altTitle: 'Tore der Wahrnehmung III',
    slug: ARTWORK_FIXTURE_SLUG,
    status: 'draft',
    yearCreated: 2019,
    yearCompleted: 2019,
    recordOrigin: 'artist-catalogued',
    catalogueNumber: 'BB-ACH-2019-003',
    catalogueSequence: 3,
    creator: creatorId,
    series: seriesId,
    medium: 'acrylic-photo-transfer-on-canvas',
    support: 'canvas',
    framing: 'unframed',
    measurementType: ['physical'],
    materialAndProcessMeaning:
      'The photo transfer process matters because it keeps the photographic layer conditional — present but contingent, always on the verge of disappearing. Acrylic works against the transfer rather than with it. The tension between the two materials is not incidental to the work; it is the work.',
    widthWhole: 90,
    widthFraction: '',
    heightWhole: 120,
    heightFraction: '',
    dimensionUnit: 'cm',
    widthMm: 900,
    heightMm: 1200,
    depthMm: 20,
    aspectRatio: 0.75,
    sizeTier: 'lg',
    orientation: 'portrait',
    city: 'Berlin',
    country: 'Germany',
    cityTgnUri: 'http://vocab.getty.edu/tgn/7003712',
    movementTags: [tagIds['Post-internet']!],
    styleTags: [tagIds['Abstraction']!, tagIds['Photography']!, tagIds['Collage']!],
    subjectTags: [tagIds['Memory']!, tagIds['Erasure']!, tagIds['Archive']!],
    genreTags: [tagIds['Painting']!],
    periodTags: [tagIds['Contemporary']!],
    conceptualKeywords: [
      { keyword: 'mediation' },
      { keyword: 'erasure' },
      { keyword: 'threshold' },
      { keyword: 'accumulation' },
      { keyword: 'the photographic index' },
    ],
    artHistoricalReferences: artHistoricalReferenceIds,
    artHistoricalContext:
      "This work sits most directly in dialogue with Rauschenberg's transfer works of the early 1960s, where the photographic layer was treated as a surface to be interrupted rather than a subject to be reproduced. The conditional legibility it shares with Richter's photo paintings is produced differently — through the transfer process itself rather than through the brush — but the epistemological position is similar: the photograph is allowed to be present only partially, only provisionally.",
    seriesContext:
      'This is the third work in the Gates of Perception sub-series and the point where the restraint logic becomes explicit. In the first two works, the painted field was expansive — it washed across the transfer. Here it contracts. The field becomes a pressure rather than a flood. In retrospect this is the hinge point of the whole sub-series: the works before it were building toward this contraction, and the works after are working out what it means.',
    consciousRejections:
      'The work was made against the idea that the photograph in painting is a surface to be illustrated — that the role of the paint is to explain or decorate the image beneath it. It was also made against the legibility of the photographic image as such: the transfer process is chosen precisely because it refuses to give you the photograph cleanly. If you want the image clearly, you would print it.',
    formalContributionAssessment:
      'The specific contribution here is using the material failure of the transfer process — the conditional legibility it produces — as a formal statement about the nature of photographic memory rather than as an imperfection to be corrected. Earlier work using photo transfer had treated the partial legibility as an effect. This work treats it as the argument.',
    sourceMaterials:
      'A photograph found at a flea market in Prenzlauer Berg, Berlin, c. 2018. The face of the subject was almost entirely faded — a silhouette against a bright window. The photograph appeared to be from the 1950s or early 1960s; the subject unidentified.',
    primaryImageAltText:
      'Gates of Perception III — acrylic photo transfer on canvas, 90 × 120 cm, 2019. A photographic transfer of an unidentified figure is interrupted by a contained field of pale acrylic paint sitting tightly against the left edge of the image.',
    documentationVideoUrl: 'https://vimeo.com/000000000',
    intent:
      "I was thinking about how photographs don't actually hold memory — they replace it. Every time you look at a photograph you look at it instead of remembering; the image substitutes for the experience it claims to document. The paint is the resistance to that replacement. It doesn't explain the photograph or decorate it. It interrupts it. The tension between the two is the work — the photograph trying to be a record, the paint refusing to let it settle.",
    intentVsOutcome:
      "I expected the restraint to feel like discipline — like the paint was being held back. It ended up feeling like pressure. The small field of paint against the edge of the transfer reads more like a force than an absence. That wasn't planned. The work became about compression where I thought it was going to be about restraint. I think that's actually truer to what was happening at that point in the series.",
    makingNote:
      'The transfer was made first — a single pass, relatively clean compared to earlier Gates works. Then I left it for several days before introducing the paint. The delay was intentional: I wanted to see the transfer on its own terms before deciding what the paint would do. The field arrived quickly once I started — two or three decisions in an afternoon. The position tight against the left edge was the third thing I tried. The first two positions were too central, too much like a response to the figure. The edge position makes it structural.',
    directInspiration:
      'The faded photograph from the Prenzlauer Berg flea market. The face was almost entirely gone — just the outline of a head against a bright window. I kept coming back to the idea that the photograph was more honest about memory when it was failing than when it was clear.',
    encounterNote:
      "Made in the studio in Neukölln in late autumn 2019. It was a quiet period — I had just finished the second Gates work and wasn't sure whether to continue the sub-series or let it resolve at two. The photograph from the market had been sitting on the studio wall for three months. At some point it became clear that the series hadn't resolved; it had paused.",
    workContext:
      'This was made during a period when the broader A Colorful History work was moving toward more complex painted fields — multiple colours, more gestural application. The Gates sub-series was running counter to that: more restrained, more focused on the specific relationship between the transferred photograph and a single constrained painted element. The two tracks were in productive tension through this period.',
    processNotes:
      'Image analysis shows a single contained rectangular painted field occupying approximately 15% of the image area, positioned tightly against the left vertical edge and extending roughly two-thirds of the image height. The transfer beneath shows low-contrast figure-ground separation consistent with a degraded original photograph or an intentionally overexposed source image. The boundary between the painted field and the transfer is clean — no visible bleed — suggesting the paint was applied after the transfer was fully dry.',
    descriptionShort:
      'A partially legible photographic transfer is held in tension with a contained field of pale acrylic paint. The photograph — the silhouette of an unidentified figure against a bright window — is present but never fully resolved. The paint does not illustrate or explain the image; it interrupts it.',
    descriptionLong: {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            version: 1,
            children: [
              {
                type: 'text',
                version: 1,
                text: 'Gates of Perception III is the third work in the Gates of Perception sub-series within A Colorful History, and the hinge point of the series. The works before it were building toward the restraint visible here; the works after are working out what that restraint means.',
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
          },
          {
            type: 'paragraph',
            version: 1,
            children: [
              {
                type: 'text',
                version: 1,
                text: 'A photographic transfer — sourced from a faded found photograph of an unidentified figure — is interrupted by a single contained field of pale acrylic. The transfer is deliberately partial: the figure is present as a silhouette, the facial detail absent. The paint does not respond to the figure. It occupies the left edge of the image as a structural pressure rather than a gesture.',
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    },
    dominantColors: [
      { hex: '#c8b89a' },
      { hex: '#8B6F4E' },
      { hex: '#f0ece4' },
      { hex: '#3a3028' },
      { hex: '#d4c4b0' },
    ],
    availabilityStatus: 'available',
    askingPrice: 12000,
    listingCurrency: 'EUR',
    editionType: 'unique',
    editions: [
      {
        formatLabel: 'Small giclée',
        widthCm: 40,
        heightCm: 53,
        substrate: 'Hahnemühle Photo Rag 308gsm',
        printTechnique: 'giclee',
        totalEditionSize: 10,
        artistProofs: 2,
        remaining: 7,
        pricePerPrint: 280,
        currency: 'EUR',
        certificate: true,
        signature: 'signed',
        notes: 'Signed and numbered recto. Certificate of authenticity included.',
      },
      {
        formatLabel: 'Medium giclée',
        widthCm: 60,
        heightCm: 80,
        substrate: 'Hahnemühle Photo Rag 308gsm',
        printTechnique: 'giclee',
        totalEditionSize: 10,
        artistProofs: 2,
        remaining: 4,
        pricePerPrint: 480,
        currency: 'EUR',
        certificate: true,
        signature: 'signed',
        notes: 'Signed and numbered recto. Certificate of authenticity included.',
      },
      {
        formatLabel: 'Large giclée',
        widthCm: 75,
        heightCm: 100,
        substrate: 'Hahnemühle Photo Rag 308gsm',
        printTechnique: 'giclee',
        totalEditionSize: 5,
        artistProofs: 1,
        remaining: 2,
        pricePerPrint: 780,
        currency: 'EUR',
        certificate: true,
        signature: 'signed',
        notes:
          'Signed and numbered recto. Certificate of authenticity included. Large format shipping on request.',
      },
    ],
    editionNotes:
      'All giclée editions are printed to order on Hahnemühle Photo Rag archival paper. Each print is signed and numbered by the artist and includes a certificate of authenticity. No open editions will be produced.',
    ownershipRegistry: [
      {
        tierLabel: 'Small giclée',
        tierOrder: 1,
        editionSize: 10,
        apCount: 2,
        copies: [
          {
            copyNumber: '3/10',
            isArtistProof: false,
            owner: 'Private collection',
            claimStatus: 'claimed-confirmed',
            collectorVisible: true,
            dateAcquired: '2021-03',
            claimedCopyNumberKnown: true,
          },
        ],
      },
      {
        tierLabel: 'Medium giclée',
        tierOrder: 2,
        editionSize: 10,
        apCount: 2,
        copies: [],
      },
    ],
    workState: 'original',
    workStateDate: '2024-01-15',
    provenanceOriginKnown: true,
    provenanceConfidenceLayer: [
      {
        claim: 'Work created in artist studio, Neukölln, 2019',
        evidenceBasis: 'Artist catalogue record',
        confidenceLevel: 'documented-fact',
      },
      {
        claim: 'Exhibited at Galerie Nord, Berlin, 2022',
        evidenceBasis: 'Exhibition invitation and install photography',
        confidenceLevel: 'credible-inference',
      },
    ],
    ownershipHistory: [
      {
        ownerPrivate: 'fixture-redacted',
        displayName: 'Private collection',
        city: 'Berlin',
        dateAcquired: '2020-06',
        collectorVisible: true,
        claimStatus: 'claimed',
      },
    ],
    sameAsUrls: [
      { url: 'https://www.artsy.net/artwork/bernard-bolter-gates-of-perception-iii' },
    ],
    sameAs: [
      {
        url: 'https://www.artsy.net/artwork/bernard-bolter-gates-of-perception-iii',
        label: 'Artsy',
      },
    ],
    license: 'all-rights-reserved',
    creditText: 'Bernard Bolter, Gates of Perception III, 2019. Courtesy the artist.',
    arEnabled: true,
    arAllowScaling: false,
    reasoningStatus: 'complete',
  } as Omit<Artwork, 'id' | 'updatedAt' | 'createdAt'>
}

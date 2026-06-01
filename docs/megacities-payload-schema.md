# Megacities — Payload CMS Schema
## Megacities Tab within bernardbolter.com Artwork Collection

> This document defines all fields for the Megacities-specific tab in the Payload CMS artwork 
> record. The base artwork record at bernardbolter.com holds shared fields (title, slug, images, 
> dates, exhibition history). Everything below lives in a dedicated `megacities` tab added to 
> that record.

---

## Field Structure Overview

```
megacities/
├── series/               Classification and series identity
├── composition/          The artwork's cities or spots
│   └── locations[]       Per-city or per-spot data
├── waterway/             River/waterway thread data (country composites)
├── interaction/          Data powering the interactive layers
│   ├── overlayData       City/spot position data for the overlay system
│   ├── seamData          Seam reveal and ghost map data
│   └── filterTags        Spot type and region filters (Skate City)
├── ar/                   AR recognition and experience data
├── video/                Video and audio layer
├── print/                Print edition and Vendure links
├── framings[]            Contextual framings — exhibition, commission, cultural moment
└── curatorial/           Artist notes, selection rationale, composition notes
```

---

## 1. Series Classification

```typescript
series: {
  
  seriesType: enum [
    'composite_country',    // Standard series — country, 7–10 cities
    'skate_city',           // Spot-based — named skate spots, not cities
    'cultural_composite',   // Cross-border, defined by culture/diaspora/political body
    'exhibition_origin',    // Made for specific commission, series status TBD
  ]

  classificationNote: string
  // Free text. E.g.:
  // "Arab League member states used as selection criterion — 
  //  political body those states chose to form, not ethnicity or religion"
  // "Former Yugoslav republics and autonomous provinces — 
  //  capitals plus Novi Sad as Serbia's second city and Vojvodina capital"

  seriesStatus: enum [
    'full_series',          // Confirmed main series entry
    'exhibition_artifact',  // Made for a specific show, series status undecided
    'undecided',            // Consciously parked — do not resolve yet
  ]

  completionStatus: enum [
    'completed_full_size',  // Final large-format file complete
    'small_scale_done',     // Composition resolved, full size not yet executed
    'in_progress',          // Work ongoing
  ]

  compositeNumber: number
  // Position in the series order (Deutsche Stadt = 1, Ukraine = 2, etc.)

  yearResearched: string    // When cities/spots were selected and small comp made
  yearCompleted: string     // When full-size execution was finished
  
}
```

---

## 2. Composition

### 2a. Top-level composition fields

```typescript
composition: {

  locationCount: number
  // Number of cities or spots in the composition
  // Not enforced to a fixed number — 7–10 for countries, up to 81 for Skate City

  compositionRationale: string
  // E.g.:
  // "9 cities — early series, portrait format constraint"
  // "7 cities — scale of Chinese urban centres required fewer 
  //  to maintain compositional balance"
  // "81 spots — full coverage of major US skate locations, 
  //  filtered by cultural significance and satellite legibility"

  citySelectionCriteria: enum [
    'largest_by_population',
    'capital_cities',
    'cultural_centres',
    'political_body_members',   // Arab League, Yugoslav republics etc.
    'geographic_anchors',
    'mixed',                    // Combination — note in rationale
  ]

  selectionNote: string
  // Free text for nuance. E.g.:
  // "Casablanca chosen over Rabat (capital) — population and urban mass 
  //  over administrative status, consistent with series approach"
  // "Donetsk included by population — fifth largest Ukrainian city. 
  //  Politically contested but selection follows data not politics"
  // "Novi Sad included as Serbia's second city and Vojvodina capital — 
  //  cultural and historical weight beyond population alone"

  dominantPalette: string[]
  // Hex values — dominant colours extracted from the composite
  // Used for UI theming on the individual artwork page

  coverageArea: string
  // Human-readable geographic scope
  // E.g. "Hamburg to Munich, Rhine corridor, Ruhr region"
  // "Los Angeles basin, Bay Area, New York metro, Chicago, 
  //  Pacific Northwest, Texas, Southeast"

}
```

### 2b. Locations array (cities or spots)

Each entry in `locations[]` covers one city (country composites) or one spot (Skate City).

```typescript
locations: [
  {
    // — Identity —
    name: string                  // "Cologne" / "Burnside Project"
    slug: string                  // "cologne" / "burnside-project"
    country: string               // "Germany" / "USA"
    region: string                // "North Rhine-Westphalia" / "Portland, Oregon"
    
    // — Population (cities only) —
    population: number
    populationYear: string        // Year of the population figure used
    
    // — Geography —
    coordinates: {
      lat: float
      lng: float
    }
    
    // — Satellite imagery —
    imageryDate: string           // When the satellite image was captured
                                  // Critical for Ukraine and other conflict contexts
    imagerySource: string         // Provider if known

    // — Position in the collage —
    positionInCollage: {
      x: float                    // % from left edge
      y: float                    // % from top edge
    }

    boundaryPolygon: [            // Optional — for seam reveal
      { x: float, y: float }     // Array of x/y % points tracing the city's 
    ]                             // masked boundary in the composite

    // — Skate City specific —
    spotType: enum [
      'bowl',
      'street_plaza',
      'skate_park',
      'diy',
      'mega_ramp',
      'pool',
      'transition',
      'ledges',
      'other'
    ]
    spotName: string              // Named spot e.g. "Burnside Project", "Stoner Plaza"
    spotLegacyNote: string        // Cultural/historical note about the spot

    // — Video layer —
    videoUrl: string
    videoType: enum [
      'rap',                      // City rap video — music of that city, from that city
      'skate',                    // Skate footage of that specific spot
      'documentary',              // Street-level or other city footage
      'none'
    ]
    videoNote: string             // E.g. "Shows the city clearly — chosen for visual 
                                  // content not just audio"

    // — Curatorial —
    citySelectionNote: string     // Why this city/spot specifically
    contextNote: string           // Anything the viewer should know
                                  // E.g. Mariupol note re: destruction post-2022
    
    // — Ghost map position (country composites) —
    actualGeoPosition: {
      x: float                    // Normalised position within country outline
      y: float                    // Used for ghost map mode animation
    }
  }
]
```

---

## 3. Waterway Thread (Country Composites)

Powers the river-as-narrative-thread interaction — the animated line that traces the river 
through the composition on first load, orienting the viewer.

```typescript
waterway: {

  hasWaterway: boolean

  waterwayName: string
  // E.g. "Main → Rhine" / "Dnipro" / "Isar, Spree, Alster, Rhine"

  thread: [                       // Ordered polyline through the composition
    {
      x: float                    // % from left
      y: float                    // % from top
      label: string               // Optional — e.g. "Main joins Rhine here"
      citySlug: string            // Optional — which city this point is near
    }
  ]

  junctions: [                    // Named transition points
    {
      name: string                // E.g. "Main–Rhine confluence"
      x: float
      y: float
      note: string
    }
  ]

  waterwayNote: string
  // E.g. "Stuttgart — no river. The city in the bowl. 
  //  Only major German city of this size without a navigable waterway."

}
```

---

## 4. Interaction Data

### 4a. Overlay system

```typescript
interaction: {

  overlaySystem: {
    type: enum [
      'city_boundary',            // Country composites — seam reveal, boundary mask
      'spot_zoom',                // Skate City — zoom and pan to spot
    ]
    
    // For spot_zoom (Skate City):
    defaultZoomLevel: float       // Starting zoom when a spot is selected
    zoomTransitionMs: number      // Animation duration
  }

  // Skate City filters
  spotFilters: {
    byType: boolean               // Enable spot type filtering
    byRegion: boolean             // Enable region/city filtering
    regions: string[]             // List of regions available as filters
                                  // E.g. ["Los Angeles", "San Francisco", 
                                  //       "New York", "Chicago", "Portland"]
  }

  // Ghost map mode (country composites)
  ghostMap: {
    available: boolean
    countryOutlineSvg: string     // Path to the normalised country outline SVG
    transitionMs: number          // Animate between composite and geo positions
    note: string                  // E.g. "Cities animate to approximate real 
                                  //  geographic positions within Germany"
  }

  // Seam reveal (country composites)
  seamReveal: {
    available: boolean
    // Toggle between masked composite and raw satellite per city
    // Uses boundaryPolygon data from locations[]
  }

  // Coordinate overlay
  coordinateGrid: {
    available: boolean
    // Toggleable lat/lng grid overlay reinforcing the satellite/cartographic aesthetic
  }

}
```

---

## 5. AR Layer

```typescript
ar: {

  arEnabled: boolean

  mindJsTargetImage: string
  // Path to the AR recognition image (the print, at recognition resolution)

  arExperienceUrl: string
  // Stable URL for the scan → overlay → video experience
  // Tied to artwork slug — never a one-time link
  // E.g. megacities.world/ar/deutsche-stadt

  supportedPrintSizes: string[]
  // Which physical print sizes are AR-enabled
  // E.g. ["A1", "Full size (1.5m × 2m)"]

  arNotes: string
  // E.g. "A0 not yet AR-enabled — target image resolution 
  //  insufficient for reliable recognition at that size"

  buyerDelivery: enum [
    'qr_on_print',
    'qr_on_insert',
    'email_post_purchase',
    'url_in_packaging',
    'multiple'
  ]
  buyerDeliveryNote: string

}
```

---

## 6. Video and Audio Layer

```typescript
video: {

  layerConcept: string
  // The framing — not metadata, curatorial voice
  // Default for country composites:
  // "Rap is the music of cities. It came from the same urban density 
  //  you're looking at from above. Every city that matters has a rap 
  //  that talks about that city specifically. This is [city]'s."

  ambientAudio: {
    available: boolean
    audioUrl: string
    // Optional generative or curated ambient audio for the artwork page
    // Plays before any city is selected
    note: string
  }

  videoFraming: enum [
    'rap_per_city',               // Standard country composite approach
    'skate_per_spot',             // Skate City approach
    'street_level_contrast',      // Ground-level footage vs satellite view
    'audio_only',                 // Rap as audio while viewing the satellite image
    'mixed'
  ]

}
```

---

## 7. Print Edition Data

```typescript
print: {

  printAvailable: boolean

  editions: [
    {
      tier: enum ['full_size', 'a0', 'a1']
      dimensions: string          // "1.5m × 2m" / "A0" / "A1"
      editionSize: number         // 4 / 200 / 500
      vendureProductId: string
      arEnabled: boolean
      available: boolean
      notes: string
    }
  ]

  certificateOfAuthenticity: enum [
    'physical',
    'digital_pdf',
    'blockchain',
    'physical_and_digital',
    'none',
    'tbd'
  ]

  fulfilmentPartner: string
  fulfilmentNotes: string

  printNotes: string

}
```

---

## 8. Contextual Framings

This is the most important field for the long game. The same images can operate in multiple 
registers. This records every activation — past and potential — so opportunities can be 
recognised and the record is complete.

```typescript
framings: [
  {
    framingType: enum [
      'overview_effect',          // Core series framing — celebration, sameness, altitude
      'community_representation', // Specific community, diaspora, neighbourhood
      'historical_document',      // Before/after — inadvertent archive function
      'political_reframe',        // Borders don't exist from altitude
      'cultural_celebration',     // Skate, rap, urban life as joy
      'commission_response',      // Made for a specific brief
    ]

    title: string
    // Short framing label
    // E.g. "Immigrant cultures in Schöneberg"
    // E.g. "Ukrainian cities before the invasion"
    // E.g. "Arab League cities — seen without conflict framing"

    description: string
    // Fuller explanation of what this framing unlocks and why it matters

    activatedBy: string
    // What brought this framing out
    // E.g. "Schöneberg commission, 2023"
    // E.g. "Russian invasion of Ukraine, February 2022"
    // E.g. "Core series concept"

    status: enum [
      'active',                   // Currently how the work is framed
      'historical',               // Was the framing at a specific moment/show
      'latent',                   // Available but not yet activated
    ]

    exhibitions: [                // Shows where this framing was used
      {
        name: string
        venue: string
        venueNote: string         // Context about the venue itself
        city: string
        year: string
        type: enum [
          'solo',
          'group',
          'commission',
          'residency',
          'performance'
        ]
        notes: string
      }
    ]

    performances: [               // Live events connected to this framing
      {
        type: string              // E.g. "freestyle_rap_performance"
        venue: string
        year: string
        description: string
      }
    ]

    potentialActivations: string
    // Free text — future contexts where this framing could be activated
    // E.g. "Arab World piece — could be shown in Cairo, Beirut, or in 
    //  context of current regional events. Work is already made."
    // E.g. "Yugoslavia piece — diaspora communities in Western Europe, 
    //  20th anniversary of 2000s EU accession processes"

  }
]
```

---

## 9. Curatorial Notes

```typescript
curatorial: {

  artistStatement: string
  // Short statement specific to this artwork — not the series statement
  // In the artist's voice

  seriesPositionNote: string
  // Where this piece sits in the series narrative
  // E.g. "First completed work. The rule-making piece. 9 cities, portrait 
  //  format. The Rhine as spine. Deutsche Stadt established what the 
  //  series was before the series knew what it was."

  processNote: string
  // How this specific piece was made — what was discovered or decided
  // E.g. "Small-scale composition made 2021. Full size executed after 
  //  the invasion began. The imagery dates are from before."

  openQuestions: string
  // Consciously parked decisions
  // E.g. "Series status of the Schöneberg three — undecided. 
  //  Do not resolve until the right context presents itself."

}
```

---

## Complete Records — Completed Works

---

### Deutsche Stadt

```json
{
  "series": {
    "seriesType": "composite_country",
    "classificationNote": "9 largest German cities by population",
    "seriesStatus": "full_series",
    "completionStatus": "completed_full_size",
    "compositeNumber": 1,
    "yearResearched": "2021",
    "yearCompleted": "2021"
  },

  "composition": {
    "locationCount": 9,
    "compositionRationale": "9 cities — first completed work, portrait format constraint. The number that fills the frame at this scale.",
    "citySelectionCriteria": "largest_by_population",
    "selectionNote": "Strict population ranking. No exceptions for capitals or political weight.",
    "coverageArea": "Hamburg (north) to Munich (south), Rhine corridor through Cologne and Düsseldorf, Frankfurt on the Main, Berlin centre, Ruhr pocket (Essen and Dortmund), Stuttgart basin"
  },

  "locations": [
    {
      "name": "Hamburg",
      "slug": "hamburg",
      "country": "Germany",
      "region": "Hamburg",
      "population": 1853935,
      "populationYear": "2021",
      "coordinates": { "lat": 53.5511, "lng": 9.9937 },
      "positionInCollage": { "x": 15, "y": 8 },
      "imageryDate": "2021",
      "videoType": "rap",
      "citySelectionNote": "Largest northern German city. Port, Alster lakes, distinctive harbour form from satellite.",
      "actualGeoPosition": { "x": 42, "y": 8 }
    },
    {
      "name": "Berlin",
      "slug": "berlin",
      "country": "Germany",
      "region": "Berlin",
      "population": 3664088,
      "populationYear": "2021",
      "coordinates": { "lat": 52.5200, "lng": 13.4050 },
      "positionInCollage": { "x": 50, "y": 35 },
      "imageryDate": "2021",
      "videoType": "rap",
      "citySelectionNote": "Largest German city. Brandenburg flatness, Spree, Tiergarten green lung.",
      "actualGeoPosition": { "x": 72, "y": 18 }
    },
    {
      "name": "Dortmund",
      "slug": "dortmund",
      "country": "Germany",
      "region": "North Rhine-Westphalia",
      "population": 588250,
      "populationYear": "2021",
      "coordinates": { "lat": 51.5136, "lng": 7.4653 },
      "positionInCollage": { "x": 30, "y": 15 },
      "imageryDate": "2021",
      "videoType": "rap",
      "citySelectionNote": "Ruhr region. Dense post-industrial fabric, minimal green. Tucked alongside Essen — the two Ruhr cities adjacent in the composition, their visual sameness deliberate.",
      "actualGeoPosition": { "x": 28, "y": 28 }
    },
    {
      "name": "Essen",
      "slug": "essen",
      "country": "Germany",
      "region": "North Rhine-Westphalia",
      "population": 582760,
      "populationYear": "2021",
      "coordinates": { "lat": 51.4556, "lng": 7.0116 },
      "positionInCollage": { "x": 18, "y": 38 },
      "imageryDate": "2021",
      "videoType": "rap",
      "citySelectionNote": "Ruhr region. Placed adjacent to Dortmund — the visual similarity of the two post-industrial cities is part of the composition's argument.",
      "actualGeoPosition": { "x": 25, "y": 30 }
    },
    {
      "name": "Frankfurt am Main",
      "slug": "frankfurt",
      "country": "Germany",
      "region": "Hesse",
      "population": 753056,
      "populationYear": "2021",
      "coordinates": { "lat": 50.1109, "lng": 8.6821 },
      "positionInCollage": { "x": 78, "y": 12 },
      "imageryDate": "2021",
      "videoType": "rap",
      "citySelectionNote": "Main river visible. Financial district density. The Main flows from here south into the Rhine — the waterway thread begins here.",
      "actualGeoPosition": { "x": 42, "y": 40 }
    },
    {
      "name": "Cologne",
      "slug": "cologne",
      "country": "Germany",
      "region": "North Rhine-Westphalia",
      "population": 1073096,
      "populationYear": "2021",
      "coordinates": { "lat": 50.9333, "lng": 6.9500 },
      "positionInCollage": { "x": 55, "y": 48 },
      "imageryDate": "2021",
      "videoType": "rap",
      "citySelectionNote": "Rhine oxbow visible. Dark uniform roofscape. The Main has become the Rhine here — the river widens and the composition's spine runs through this city.",
      "actualGeoPosition": { "x": 28, "y": 42 }
    },
    {
      "name": "Düsseldorf",
      "slug": "dusseldorf",
      "country": "Germany",
      "region": "North Rhine-Westphalia",
      "population": 619477,
      "populationYear": "2021",
      "coordinates": { "lat": 51.2217, "lng": 6.7762 },
      "positionInCollage": { "x": 20, "y": 65 },
      "imageryDate": "2021",
      "videoType": "rap",
      "citySelectionNote": "Rhine continues south. Third Rhine city in sequence after Frankfurt and Cologne.",
      "actualGeoPosition": { "x": 27, "y": 35 }
    },
    {
      "name": "Stuttgart",
      "slug": "stuttgart",
      "country": "Germany",
      "region": "Baden-Württemberg",
      "population": 626275,
      "populationYear": "2021",
      "coordinates": { "lat": 48.7758, "lng": 9.1829 },
      "positionInCollage": { "x": 82, "y": 80 },
      "imageryDate": "2021",
      "videoType": "rap",
      "citySelectionNote": "No river. The city in the bowl — hemmed by hills, no navigable waterway. Only major German city of this scale without one. Its absence in the waterway thread is itself information.",
      "actualGeoPosition": { "x": 42, "y": 72 }
    },
    {
      "name": "Munich",
      "slug": "munich",
      "country": "Germany",
      "region": "Bavaria",
      "population": 1487708,
      "populationYear": "2021",
      "coordinates": { "lat": 48.1351, "lng": 11.5820 },
      "positionInCollage": { "x": 25, "y": 88 },
      "imageryDate": "2021",
      "videoType": "rap",
      "citySelectionNote": "Isar river. More green than expected for a city this size. Bavarian sprawl — different tonal register to the Rhine cities.",
      "actualGeoPosition": { "x": 55, "y": 82 }
    }
  ],

  "waterway": {
    "hasWaterway": true,
    "waterwayName": "Main → Rhine",
    "junctions": [
      {
        "name": "Main–Rhine confluence",
        "note": "River widens here. Frankfurt becomes Cologne. The spine of the composition."
      }
    ],
    "waterwayNote": "Stuttgart has no river — only city in the composition without one. Munich has the Isar. Hamburg has the Alster and Elbe. The Rhine threads Frankfurt, Cologne, and Düsseldorf in sequence — the navigable backbone of the piece."
  },

  "interaction": {
    "overlaySystem": { "type": "city_boundary" },
    "ghostMap": {
      "available": true,
      "note": "Cities animate to approximate real geographic positions within Germany — Hamburg north, Munich south, Rhine cities west, Berlin east. Toggle reveals the latitudinal logic embedded in the composition."
    },
    "seamReveal": { "available": true },
    "coordinateGrid": { "available": true }
  },

  "ar": {
    "arEnabled": true,
    "arExperienceUrl": "/ar/deutsche-stadt",
    "supportedPrintSizes": ["A1", "Full size (1.5m × 2m)"],
    "buyerDelivery": "multiple"
  },

  "video": {
    "layerConcept": "Rap is the music of cities. It came from the same urban density you're looking at from above. Every city that matters has a rap that talks about that city specifically. This is [city]'s.",
    "videoFraming": "rap_per_city"
  },

  "framings": [
    {
      "framingType": "overview_effect",
      "title": "The series foundation",
      "description": "The first completed work. Established what the series was — the sameness and the fingerprint, the Rhine as spine, the Ruhr cities adjacent and visually indistinguishable. The rule-making piece.",
      "activatedBy": "Core series concept",
      "status": "active"
    },
    {
      "framingType": "community_representation",
      "title": "German identity in Schöneberg",
      "description": "Shown at the Pallaseum alongside Turkey, Arab World, and Former Yugoslavia — four pieces representing the communities present in the Schöneberg neighbourhood. Deutsche Stadt's inclusion is significant: the show was not only about immigrant communities, it was about the whole neighbourhood. Germans and immigrants in the same frame, seen from the same altitude, in the same visual language. Everyone in Schöneberg is in one of these four images.",
      "activatedBy": "Schöneberg commission, 2023",
      "status": "historical",
      "exhibitions": [
        {
          "name": "Schöneberg Project",
          "venue": "Pallaseum",
          "venueNote": "Brutalist social housing block built in the 1970s off Potsdamer Straße, Berlin-Schöneberg. Historically home to large Turkish and Arab communities in West Berlin. The venue is part of the meaning — the building itself is a piece of social history.",
          "city": "Berlin",
          "year": "2023",
          "type": "commission",
          "notes": "Four-piece exhibition: Deutsche Stadt, Turkey, Arab World, Former Yugoslavia. One piece per major community in the neighbourhood — German, Turkish, Arab, Yugoslav. All in the same visual language, all seen from the same altitude."
        }
      ],
      "performances": [
        {
          "type": "freestyle_rap_performance",
          "venue": "Pallaseum, Berlin-Schöneberg",
          "year": "2023",
          "description": "Live freestyle rap performance about the compositions at the exhibition opening. The artist performing the same gesture as the work — finding the cultural voice of a place and composing it into something new. Rap as the ground-level counterpart to the satellite view."
        }
      ],
      "potentialActivations": "Any exhibition context exploring German urban identity, migration, or neighbourhood as concept. The Schöneberg framing can be reactivated wherever the four pieces show together."
    }
  ],

  "curatorial": {
    "seriesPositionNote": "First completed work. The rule-making piece. 9 cities, portrait format. Deutsche Stadt established what the series was before the series knew what it was.",
    "processNote": "The 9-city constraint came from the portrait format — enough mass to create density without sparseness. China later broke this constraint, revealing it was always a practical not a principled rule.",
    "openQuestions": ""
  }
}
```

---

### Ukraine

```json
{
  "series": {
    "seriesType": "composite_country",
    "seriesStatus": "full_series",
    "completionStatus": "completed_full_size",
    "compositeNumber": 2,
    "yearResearched": "2021",
    "yearCompleted": "2022"
  },

  "composition": {
    "locationCount": 9,
    "compositionRationale": "9 cities — second completed work, same portrait format approach as Deutsche Stadt. Cities selected and composition resolved in 2021, before the invasion.",
    "citySelectionCriteria": "largest_by_population",
    "selectionNote": "Strict population ranking. Donetsk included as fifth-largest Ukrainian city — politically contested but selection follows population data not political sensitivity. Mariupol included by population and coastal significance.",
    "coverageArea": "Kyiv centre, Kharkiv (eastern, near Russian border), Odessa (Black Sea coast), Lviv (western, Central European character), Dnipro, Zaporizhzhia, Mariupol (Sea of Azov), Donetsk, plus one further city TBC"
  },

  "locations": [
    {
      "name": "Mariupol",
      "slug": "mariupol",
      "country": "Ukraine",
      "region": "Donetsk Oblast",
      "coordinates": { "lat": 47.0956, "lng": 37.5494 },
      "imageryDate": "2021",
      "videoType": "rap",
      "contextNote": "Satellite imagery captured 2021, prior to the Russian invasion of February 2022. Mariupol was subjected to sustained siege and near-total destruction in spring 2022. This image is a document of the city as it was.",
      "citySelectionNote": "Sea of Azov port city. Selected by population."
    },
    {
      "name": "Donetsk",
      "slug": "donetsk",
      "country": "Ukraine",
      "region": "Donetsk Oblast",
      "coordinates": { "lat": 48.0159, "lng": 37.8028 },
      "imageryDate": "2021",
      "videoType": "rap",
      "contextNote": "Under Russian-backed separatist control since 2014 at time of imagery capture. Fifth largest Ukrainian city by population — included by population data not political status.",
      "citySelectionNote": "Population-based selection. Politically contested — selection follows data not politics."
    }
  ],

  "waterway": {
    "hasWaterway": true,
    "waterwayName": "Dnipro",
    "waterwayNote": "The Dnipro threads Kyiv, Dnipro city, Zaporizhzhia, and Kherson — structural backbone of the composition analogous to the Rhine in Deutsche Stadt."
  },

  "interaction": {
    "overlaySystem": { "type": "city_boundary" },
    "ghostMap": { "available": true },
    "seamReveal": { "available": true },
    "coordinateGrid": { "available": true }
  },

  "ar": {
    "arEnabled": true,
    "arExperienceUrl": "/ar/ukraine",
    "supportedPrintSizes": ["A1", "Full size (1.5m × 2m)"]
  },

  "video": {
    "layerConcept": "Rap is the music of cities. Every city that matters has a rap that talks about that city specifically. This is [city]'s.",
    "videoFraming": "rap_per_city"
  },

  "framings": [
    {
      "framingType": "overview_effect",
      "title": "Cities as cities",
      "description": "Nine Ukrainian cities seen as urban places — roads, rivers, housing grids. The same infrastructure of human settlement visible in every country in the series.",
      "activatedBy": "Core series concept",
      "status": "active"
    },
    {
      "framingType": "historical_document",
      "title": "Ukrainian cities before the invasion",
      "description": "Composition researched and resolved in 2021. Full-size execution completed after the invasion began in February 2022. The satellite imagery is from before. Several cities — particularly Mariupol — were subjected to severe destruction after the imagery was captured. The piece is an inadvertent archive of these cities as they were.",
      "activatedBy": "Russian invasion of Ukraine, February 2022",
      "status": "active",
      "potentialActivations": "Reconstruction contexts. Memorial exhibitions. Any framing that asks what was lost."
    }
  ],

  "curatorial": {
    "seriesPositionNote": "Second completed work. Made under circumstances that changed its meaning before it was finished. The imagery dates matter more here than anywhere else in the series.",
    "processNote": "Cities chosen and small-scale composition completed 2021. Full-size execution happened after the invasion. The decision was made to complete it — the work was already done, the cities already chosen, the satellites already captured. Completing it was the right call.",
    "openQuestions": "Exhibition context — has shown at Kühlhaus Berlin. Further exhibition contexts should be chosen carefully given the weight of the Mariupol imagery."
  }
}
```

---

### Schöneberg Works

> Turkey is a confirmed full series entry. Arab World and Former Yugoslavia remain consciously undecided — do not resolve until the right context presents itself.

```json
{
  "title": "Turkey",
  "series": {
    "seriesType": "composite_country",
    "classificationNote": "9 largest Turkish cities by population. Made for the Schöneberg commission — the Pallaseum project origin does not change its series status.",
    "seriesStatus": "full_series",
    "completionStatus": "completed_full_size",
    "compositeNumber": 5,
    "yearCompleted": "2023"
  },
  "composition": {
    "locationCount": 9,
    "compositionRationale": "9 cities — made in the same period as Deutsche Stadt and Ukraine, same portrait format logic.",
    "citySelectionCriteria": "largest_by_population",
    "selectionNote": "Population ranking. Istanbul is by far the largest — its mass in the composition reflects that. The Bosphorus strait splitting the city between two continents is unique in the series.",
    "coverageArea": "Istanbul (northwest, two continents), Ankara (central Anatolian plateau), Izmir (Aegean coast), Bursa (northwest), Antalya (Mediterranean coast), Adana (south), Gaziantep (southeast), Konya (central), Mersin or Diyarbakır (south/southeast)"
  },
  "locations": [
    {
      "name": "Istanbul",
      "slug": "istanbul",
      "country": "Turkey",
      "region": "Istanbul",
      "coordinates": { "lat": 41.0082, "lng": 28.9784 },
      "imageryDate": "2023",
      "videoType": "rap",
      "citySelectionNote": "Largest Turkish city by a significant margin. The Bosphorus strait is the defining satellite feature — the only city in the entire series that sits on a continental boundary. Europe on one side, Asia on the other, the strait between."
    },
    {
      "name": "Ankara",
      "slug": "ankara",
      "country": "Turkey",
      "region": "Ankara",
      "coordinates": { "lat": 39.9334, "lng": 32.8597 },
      "imageryDate": "2023",
      "videoType": "rap",
      "citySelectionNote": "Capital and second largest city. Central Anatolian plateau — drier, more angular than the coastal cities."
    },
    {
      "name": "Izmir",
      "slug": "izmir",
      "country": "Turkey",
      "region": "Izmir",
      "coordinates": { "lat": 38.4192, "lng": 27.1287 },
      "imageryDate": "2023",
      "videoType": "rap",
      "citySelectionNote": "Aegean coast. The bay is a strong satellite feature."
    },
    {
      "name": "Bursa",
      "slug": "bursa",
      "country": "Turkey",
      "region": "Bursa",
      "coordinates": { "lat": 40.1826, "lng": 29.0665 },
      "imageryDate": "2023",
      "videoType": "rap"
    },
    {
      "name": "Antalya",
      "slug": "antalya",
      "country": "Turkey",
      "region": "Antalya",
      "coordinates": { "lat": 36.8969, "lng": 30.7133 },
      "imageryDate": "2023",
      "videoType": "rap",
      "citySelectionNote": "Mediterranean coast. Distinctive coastal edge from satellite."
    },
    {
      "name": "Adana",
      "slug": "adana",
      "country": "Turkey",
      "region": "Adana",
      "coordinates": { "lat": 37.0000, "lng": 35.3213 },
      "imageryDate": "2023",
      "videoType": "rap"
    },
    {
      "name": "Gaziantep",
      "slug": "gaziantep",
      "country": "Turkey",
      "region": "Gaziantep",
      "coordinates": { "lat": 37.0662, "lng": 37.3833 },
      "imageryDate": "2023",
      "videoType": "rap",
      "citySelectionNote": "Southeast Turkey. Different urban texture — drier, more compact, ancient city fabric beneath modern sprawl."
    },
    {
      "name": "Konya",
      "slug": "konya",
      "country": "Turkey",
      "region": "Konya",
      "coordinates": { "lat": 37.8714, "lng": 32.4846 },
      "imageryDate": "2023",
      "videoType": "rap",
      "citySelectionNote": "Central Anatolia. Flat surrounding landscape makes the city form very legible from satellite."
    },
    {
      "name": "Mersin",
      "slug": "mersin",
      "country": "Turkey",
      "region": "Mersin",
      "coordinates": { "lat": 36.8000, "lng": 34.6333 },
      "imageryDate": "2023",
      "videoType": "rap",
      "citySelectionNote": "Mediterranean port city. Confirm against Diyarbakır for final population ranking."
    }
  ],
  "waterway": {
    "hasWaterway": true,
    "waterwayName": "Bosphorus",
    "waterwayNote": "The Bosphorus is not a river but a strait — and it is unlike any waterway in the series. Istanbul sits across it: Europe to the west, Asia to the east. The only city in the Megacities archive on a continental boundary. The strait is the spine of the Istanbul segment and the most distinctive satellite feature in the Turkish composition."
  },
  "interaction": {
    "overlaySystem": { "type": "city_boundary" },
    "ghostMap": {
      "available": true,
      "note": "Cities animate to approximate real geographic positions within Turkey — Istanbul northwest, Ankara centre, coastal cities on their respective coasts, southeastern cities in the southeast."
    },
    "seamReveal": { "available": true },
    "coordinateGrid": { "available": true }
  },
  "ar": {
    "arEnabled": true,
    "arExperienceUrl": "/ar/turkey",
    "supportedPrintSizes": ["A1", "Full size (1.5m × 2m)"]
  },
  "video": {
    "layerConcept": "Rap is the music of cities. Every city that matters has a rap that talks about that city specifically. This is [city]'s.",
    "videoFraming": "rap_per_city"
  },
  "framings": [
    {
      "framingType": "overview_effect",
      "title": "Turkish cities as cities",
      "description": "Nine Turkish cities in the same visual language as every other country in the series — roads, coastlines, city fabric, the universal infrastructure of human settlement.",
      "activatedBy": "Core series concept",
      "status": "active"
    },
    {
      "framingType": "community_representation",
      "title": "Turkish community in Schöneberg — origin context",
      "description": "First shown at the Pallaseum as part of a four-piece exhibition representing the communities of Berlin-Schöneberg. The commission is where this piece began, not what it is. It is a full series entry that carries that origin.",
      "activatedBy": "Schöneberg commission, 2023",
      "status": "historical",
      "exhibitions": [
        {
          "name": "Schöneberg Project",
          "venue": "Pallaseum",
          "venueNote": "Brutalist social housing block off Potsdamer Straße, Berlin-Schöneberg. Historically home to large Turkish and Arab communities in West Berlin.",
          "city": "Berlin",
          "year": "2023",
          "type": "commission",
          "notes": "Four-piece exhibition: Deutsche Stadt, Turkey, Arab World, Former Yugoslavia. The Schöneberg neighbourhood represented in four satellite composites — German, Turkish, Arab, Yugoslav communities, all in the same visual language."
        }
      ],
      "performances": [
        {
          "type": "freestyle_rap_performance",
          "venue": "Pallaseum, Berlin-Schöneberg",
          "year": "2023",
          "description": "Live freestyle rap performance about the compositions at the exhibition opening."
        }
      ],
      "potentialActivations": "Turkish cultural institutions in Germany and Turkey. Diaspora community contexts. Can show independently as a full series entry or as part of the Schöneberg four."
    }
  ],
  "curatorial": {
    "seriesPositionNote": "Made for the Schöneberg commission but a full series entry — the commission is the origin, not the definition. Istanbul's Bosphorus is the most geographically distinctive feature in the series so far: the only city across two continents.",
    "openQuestions": "Confirm final city list — Mersin vs Diyarbakır for 9th position by population."
  }
}

```json
{
  "title": "Arab World",
  "series": {
    "seriesType": "cultural_composite",
    "classificationNote": "Cities from Arab League member states — the political body those states chose to form. Not defined by ethnicity, language purity, or religion. Cities include Cairo, Baghdad, Damascus, Beirut, Casablanca, Algiers, Riyadh, and others from the League membership.",
    "seriesStatus": "undecided",
    "completionStatus": "completed_full_size",
    "yearCompleted": "2023"
  },
  "composition": {
    "citySelectionCriteria": "political_body_members",
    "selectionNote": "Arab League used as the selection criterion — a principled, non-essentialist frame. Casablanca chosen over Rabat (capital) — population and urban mass over administrative status, consistent with series approach.",
    "coverageArea": "Atlantic coast (Casablanca) to the Gulf (Riyadh) — the full geographic spread of the Arab League"
  },
  "framings": [
    {
      "framingType": "community_representation",
      "title": "Arab communities in Schöneberg",
      "description": "Made for the Pallaseum project — representing Arab immigrant communities in Berlin-Schöneberg.",
      "activatedBy": "Schöneberg commission, 2023",
      "status": "historical",
      "exhibitions": [
        {
          "name": "Schöneberg Project",
          "venue": "Pallaseum",
          "venueNote": "Brutalist social housing block off Potsdamer Straße, Berlin-Schöneberg. Historically home to large Turkish and Arab communities in West Berlin. The venue is part of the meaning.",
          "city": "Berlin",
          "year": "2023",
          "type": "commission",
          "notes": "Four-piece exhibition: Deutsche Stadt, Turkey, Arab World, Former Yugoslavia. The Schöneberg neighbourhood represented in four satellite composites — German, Turkish, Arab, Yugoslav communities, all seen from the same altitude in the same visual language."
        }
      ],
      "performances": [
        {
          "type": "freestyle_rap_performance",
          "venue": "Pallaseum, Berlin-Schöneberg",
          "year": "2023",
          "description": "Live freestyle rap performance about the compositions."
        }
      ]
    },
    {
      "framingType": "political_reframe",
      "title": "Arab cities without the conflict frame",
      "description": "Baghdad, Damascus, Beirut, Gaza — cities that have been in Western news cycles for decades almost entirely through the lens of conflict, terrorism, or instability. Seen from satellite, they are just cities. Roads, rivers, housing grids. The same infrastructure of human settlement visible in Stuttgart or Denver. The Overview Effect is most powerful here — from altitude there is no axis of evil, no failed state. Just places people live.",
      "activatedBy": "The nature of the cities selected and their Western media representation",
      "status": "latent",
      "potentialActivations": "Shown in Cairo, Beirut, Amman, or Casablanca — the work arriving in the cities it depicts. Cultural institutions working on representation and media framing. Any moment in the current regional situation where a different kind of looking is needed. The work is already made."
    }
  ],
  "curatorial": {
    "openQuestions": "Series status undecided. The cross-border/cultural composite format doesn't fit the country-by-country logic of the main series — but it does the most conceptual work of any piece in the archive. Individual country composites of Iraq, Syria are in small-scale composition. The Arab World piece may be most powerful as its own thing — not a substitute for those individual country works but something different in kind.",
    "artistStatement": "These are pictures of our world. The satellite doesn't editorialise. Baghdad is a city. Damascus is a city. Beirut is a city. The same roads, the same rivers, the same housing grids."
  }
}
```

```json
{
  "title": "Former Yugoslavia",
  "series": {
    "seriesType": "cultural_composite",
    "classificationNote": "Capitals of the former Yugoslav republics and autonomous provinces, plus Novi Sad as Serbia's second city and Vojvodina capital. Cities: Belgrade, Zagreb, Ljubljana, Sarajevo, Skopje, Podgorica, Pristina, Novi Sad.",
    "seriesStatus": "undecided",
    "completionStatus": "completed_full_size",
    "yearCompleted": "2023"
  },
  "composition": {
    "locationCount": 8,
    "citySelectionCriteria": "political_body_members",
    "selectionNote": "Yugoslav republic capitals plus autonomous province capitals. Novi Sad included as Serbia's second city — cultural and historical weight (Vojvodina, 1999 NATO bombing of the Novi Sad bridges) beyond population alone. Pristina included — de facto capital of Kosovo, disputed but functionally independent.",
    "coverageArea": "Ljubljana (Alpine, northwest) to Skopje (arid, south) — the full geographic range of the former federation"
  },
  "locations": [
    {
      "name": "Sarajevo",
      "contextNote": "Siege of Sarajevo 1992–1996. The city in the valley — hemmed by mountains that became firing positions. From satellite, a linear city form following the Miljacka river through a narrow basin."
    },
    {
      "name": "Novi Sad",
      "contextNote": "Vojvodina capital. 1999 NATO bombing destroyed the bridges over the Danube — the bridges are part of Novi Sad's satellite signature.",
      "citySelectionNote": "Included beyond the strict capital-only logic — cultural and historical weight warranted it."
    }
  ],
  "waterway": {
    "hasWaterway": true,
    "waterwayName": "Danube, Sava, Miljacka, Vardar",
    "waterwayNote": "Belgrade sits at the Sava–Danube confluence — two major rivers meeting, a dramatic satellite signature. Novi Sad also on the Danube. The mountain-locked cities further south — Sarajevo, Skopje — have no navigable waterway in the Rhine/Danube sense."
  },
  "framings": [
    {
      "framingType": "community_representation",
      "title": "Yugoslav diaspora communities in Schöneberg",
      "description": "Made for the Pallaseum project — representing communities from the former Yugoslavia living in Berlin-Schöneberg.",
      "activatedBy": "Schöneberg commission, 2023",
      "status": "historical",
      "exhibitions": [
        {
          "name": "Schöneberg Project",
          "venue": "Pallaseum",
          "venueNote": "Brutalist social housing block off Potsdamer Straße, Berlin-Schöneberg. Historically home to large Turkish and Arab communities in West Berlin.",
          "city": "Berlin",
          "year": "2023",
          "type": "commission",
          "notes": "Four-piece exhibition: Deutsche Stadt, Turkey, Arab World, Former Yugoslavia. The Schöneberg neighbourhood represented in four satellite composites — German, Turkish, Arab, Yugoslav communities, all seen from the same altitude in the same visual language."
        }
      ]
    },
    {
      "framingType": "political_reframe",
      "title": "Yugoslavia recomposed — borders don't exist from altitude",
      "description": "Cities separated by a war that redrew borders within living memory, recomposed into a single image. From satellite, the borders don't exist. Ljubljana and Sarajevo and Belgrade are just cities — the same rooftops, the same river curves, the same grid of streets. The Overview Effect makes the dissolution of Yugoslavia look like a matter of human administrative choice imposed on a landscape that doesn't recognise it.",
      "activatedBy": "The nature of the composition — former federation recomposed",
      "status": "latent",
      "potentialActivations": "Diaspora community exhibitions across Western Europe. Reconciliation and memory contexts in the region. 30th anniversary of the Dayton Agreement (2025). Shown in any of the cities it depicts."
    }
  ],
  "curatorial": {
    "openQuestions": "Series status undecided. Individual country composites of Serbia (Belgrade), Croatia (Zagreb) etc. may eventually enter the main series. This piece may be most powerful kept as the whole — the recomposition is the argument, breaking it into countries loses the point.",
    "artistStatement": "From altitude, the borders don't show."
  }
}
```

---

## Field Summary — Quick Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `series.seriesType` | enum | Yes | |
| `series.seriesStatus` | enum | Yes | Including 'undecided' as valid |
| `series.completionStatus` | enum | Yes | |
| `series.compositeNumber` | number | No | Main series only |
| `series.yearResearched` | string | Yes | Especially critical for Ukraine |
| `series.yearCompleted` | string | Yes | |
| `composition.locationCount` | number | Yes | |
| `composition.compositionRationale` | string | Yes | Curatorial voice |
| `composition.citySelectionCriteria` | enum | Yes | |
| `composition.selectionNote` | string | Yes | |
| `locations[].name` | string | Yes | |
| `locations[].imageryDate` | string | Yes | |
| `locations[].positionInCollage` | {x,y} | Yes | For overlay system |
| `locations[].boundaryPolygon` | [{x,y}] | No | For seam reveal |
| `locations[].videoUrl` | string | No | |
| `locations[].videoType` | enum | Yes | |
| `locations[].contextNote` | string | No | Use for Mariupol etc. |
| `locations[].actualGeoPosition` | {x,y} | No | For ghost map mode |
| `locations[].spotType` | enum | Skate only | |
| `waterway.hasWaterway` | boolean | Yes | |
| `waterway.thread` | [{x,y,label}] | No | For animated river trace |
| `interaction.overlaySystem.type` | enum | Yes | |
| `interaction.ghostMap.available` | boolean | Country only | |
| `interaction.seamReveal.available` | boolean | Country only | |
| `interaction.spotFilters` | object | Skate only | |
| `ar.arEnabled` | boolean | Yes | |
| `ar.arExperienceUrl` | string | If enabled | Stable slug-based URL |
| `ar.supportedPrintSizes` | string[] | If enabled | |
| `print.printAvailable` | boolean | Yes | |
| `print.editions[]` | array | If available | Per tier |
| `framings[]` | array | Yes | At least one entry |
| `framings[].status` | enum | Yes | active / historical / latent |
| `curatorial.openQuestions` | string | No | Park consciously |

---

*Schema version 1.0 — Megacities / bernardbolter.com*
*Developed May 2026*

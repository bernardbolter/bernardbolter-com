# Artwork Page JSON-LD Update
## bernardbolter.com · generateArtworkJsonLd.ts additions
*June 2026 · Bernard Bolter × Claude*

---

## Read first

- `artwork-page-directive.md` — the base JSON-LD spec this extends. Do not re-implement what's already there; only add what's new below.
- `print-data-architecture-reference-v2.md` — the edition tier model; the new `artism:editionTierSpec` and `artism:editionClaimSummary` fields read from `dcs.editionTiers[]` and `SeriesEditionTiers`, not the old `ownershipRegistry[]`
- `artism-vocabulary.md` — namespace and term definitions

---

## What already exists (do not duplicate)

Per `artwork-page-directive.md`, `generateArtworkJsonLd.ts` already outputs:
`@type: VisualArtwork`, `name`, `alternateName`, `identifier` (catalogue number), `url`, `sameAs`, `creator` (Person with ULAN/Wikidata), `dateCreated`, `artMedium`, `artworkSurface`, `width`/`height`/`depth`, `locationCreated` (Place with TGN URI), `isPartOf` (series as Collection), `subjectOf` (events as ExhibitionEvent array), `license`, `creditText`, and `additionalProperty` array covering all `artism:` intent/process/assessment fields.

---

## New additions

### 1. `artism:editionTierSpec` — what physical forms this work takes

A machine-readable summary of the print tier structure for this artwork. Reads through the `seriesEditionTier` relation when populated, falls back to local tier fields otherwise. Never includes pricing, stock levels, or ownership data.

```json
"artism:editionTierSpec": [
  {
    "tierName": "Monumental",
    "isOriginalTier": true,
    "editionSize": 3,
    "apCount": 1,
    "widthCm": 121.9,
    "heightCm": 121.9,
    "substrate": "Aluminium mount",
    "printTechnique": "Digital C-print"
  },
  {
    "tierName": "Collectors print",
    "isOriginalTier": false,
    "editionSize": 9,
    "apCount": 2,
    "widthCm": 60,
    "heightCm": 60,
    "substrate": "Aluminium mount",
    "printTechnique": "Digital C-print"
  },
  {
    "tierName": "Small print",
    "isOriginalTier": false,
    "editionSize": 200,
    "apCount": 0,
    "widthCm": 33,
    "heightCm": 33,
    "substrate": "Paper",
    "printTechnique": "Pigment print"
  }
]
```

Output only when `artwork.hasEditions !== 'none'`. Never include `vendureProductId`, `vendureVariantId`, `editionsRemaining`, or price. Output for works with `hasEditions: 'open'` should instead output `artism:untrackedEditionsNote` as a plain string rather than a structured tier array.

### 2. `artism:editionClaimSummary` — ownership summary per tier

Already specced in earlier addenda but needs updating to reflect the real data path (now reads from `dcs.editionTiers[].copies[]`, not `ownershipRegistry[]`):

```json
"artism:editionClaimSummary": [
  "Monumental: 1 of 3 claimed",
  "Collectors print: 0 of 9 claimed",
  "Small print: 0 of 200 claimed"
]
```

Claimed-count computed from `copies[]` entries where `claimStatus === 'claimed-confirmed'` and `isArtistProof === false` — same logic as the page display. AP copies excluded from both numerator and denominator. Output only when `hasEditions === 'limited'` and at least one tier has `copies[]` data (even empty — zero-claimed is a real, honest signal). Never output raw `copies[]` data.

### 3. `artism:provenanceConfidenceLevel` — rolled-up confidence signal

Already specced but confirm it's actually being output. Single string value:

```json
"artism:provenanceConfidenceLevel": "partially-documented"
```

Values: `fully-documented` (all claims `documented-fact`), `partially-documented` (mix of `documented-fact` and `credible-inference`), `origin-undocumented` (`provenanceOriginKnown === false`), `undocumented` (no `provenanceConfidenceLayer` entries at all). Output only when `provenanceConfidenceLayer` is non-empty.

### 4. `artism:provenanceClaims` — structured public claims

**New — this is the most significant addition for machine-readability.** Outputs the `documented-fact` and `credible-inference` claims from `provenanceConfidenceLayer` as structured data. `institutional-assertion` and `speculation` are never output. This makes the archive's honest provenance record harvestable by AI systems and catalogues in a way no existing art database provides.

```json
"artism:provenanceClaims": [
  {
    "claim": "Work created during a Gerrit Rietveld Akademie school trip to Basel, 2007",
    "confidenceLevel": "documented-fact"
  },
  {
    "claim": "First exhibited at the Gerrit Rietveld Akademie, before the Christmas break, 2007 — printed on A3 sheets",
    "confidenceLevel": "documented-fact"
  },
  {
    "claim": "A Collector's print copy was later exhibited in Amsterdam, at a separate exhibition from the Rietveld show",
    "confidenceLevel": "documented-fact"
  },
  {
    "claim": "That copy was sold at auction by the artist directly, at the Amsterdam exhibition",
    "confidenceLevel": "documented-fact"
  }
]
```

Note: `evidenceBasis` is **not** output in JSON-LD — it's a private internal note for the artist, not a public fact. Only `claim` and `confidenceLevel` are exposed.

### Do NOT

- Do not output `institutional-assertion` or `speculation` claims in `artism:provenanceClaims`
- Do not output `evidenceBasis` — private internal field, stays out of JSON-LD entirely
- Do not output raw `ownershipHistory` entries or owner names — `artism:editionClaimSummary` is the only ownership-derived JSON-LD output

### 5. `artism:originalEditionSize` — for multi-copy originals

For DCS/Megacities works where `isOriginalTier === true` on one tier, add a top-level signal that this work exists as a small original edition rather than a unique object:

```json
"artism:originalEditionSize": 3,
"artism:originalEditionApCount": 1
```

Output only when an `isOriginalTier === true` tier exists. Helps AI systems and catalogues reason correctly about works that are "original editions" rather than "unique originals" or "print editions" — a distinction most art schemas currently have no way to express cleanly.

### 6. `artism:relatedWork` — derivative works

When `relatedWorks[]` is populated (e.g. the Da Fen oil painting interpretation for Basel Switzerland):

```json
"artism:relatedWork": [
  {
    "relationshipType": "derivative-oil-painting",
    "description": "A related oil painting interpretation exists — a Da Fen collaboration work, catalogued independently of this digital edition.",
    "url": "https://bernardbolter.com/[relatedArtwork.slug]"
  }
]
```

If `relatedArtwork` relation is set, include `url`. If only `relatedWorkNote` is populated (no record yet), include only `description`. Never include ownership, location, or sale data about the related work — each has its own record for that.

---

## Full updated output shape for Basel Switzerland

For reference — what the complete JSON-LD should look like for a fully-catalogued DCS work:

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  },
  "@type": "VisualArtwork",
  "name": "Basel Switzerland",
  "alternateName": "Basel, Schweiz",
  "identifier": {
    "@type": "PropertyValue",
    "propertyID": "CatalogueNumber",
    "value": "BB-DCS-2007-002"
  },
  "url": "https://bernardbolter.com/basel-switzerland",
  "sameAs": [],
  "creator": {
    "@type": "Person",
    "name": "Bernard Bolter",
    "identifier": [
      { "@type": "PropertyValue", "propertyID": "ULAN", "value": "[artist.ulanUri]" },
      { "@type": "PropertyValue", "propertyID": "Wikidata", "value": "[artist.wikidataUri]" }
    ]
  },
  "dateCreated": "2007",
  "artMedium": "Photo collage",
  "artworkSurface": "Board",
  "width": { "@type": "QuantitativeValue", "value": 121.9, "unitCode": "CMT", "unitText": "cm" },
  "height": { "@type": "QuantitativeValue", "value": 121.9, "unitCode": "CMT", "unitText": "cm" },
  "locationCreated": {
    "@type": "Place",
    "name": "Basel",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Basel",
      "addressCountry": "CH"
    }
  },
  "isPartOf": {
    "@type": "Collection",
    "name": "Digital City Series",
    "url": "https://bernardbolter.com/series/digital-city-series"
  },
  "subjectOf": [
    {
      "@type": "ExhibitionEvent",
      "name": "Gerrit Rietveld Akademie Graduation Show",
      "startDate": "2007",
      "location": {
        "@type": "Place",
        "name": "Gerrit Rietveld Academie",
        "address": { "@type": "PostalAddress", "addressLocality": "Amsterdam", "addressCountry": "NL" }
      }
    }
  ],
  "artism:editionTierSpec": [
    {
      "tierName": "Monumental",
      "isOriginalTier": true,
      "editionSize": 3,
      "apCount": 1,
      "widthCm": 121.9,
      "heightCm": 121.9,
      "substrate": "Aluminium mount",
      "printTechnique": "Digital C-print"
    },
    {
      "tierName": "Collectors print",
      "isOriginalTier": false,
      "editionSize": 9,
      "apCount": 2,
      "widthCm": 60,
      "heightCm": 60,
      "substrate": "Aluminium mount",
      "printTechnique": "Digital C-print"
    },
    {
      "tierName": "Small print",
      "isOriginalTier": false,
      "editionSize": 200,
      "apCount": 0,
      "widthCm": 33,
      "heightCm": 33,
      "substrate": "Paper",
      "printTechnique": "Pigment print"
    }
  ],
  "artism:editionClaimSummary": [
    "Monumental: 1 of 3 claimed",
    "Collectors print: 0 of 9 claimed",
    "Small print: 0 of 200 claimed"
  ],
  "artism:originalEditionSize": 3,
  "artism:originalEditionApCount": 1,
  "artism:provenanceConfidenceLevel": "fully-documented",
  "artism:provenanceClaims": [
    {
      "claim": "Work created during a Gerrit Rietveld Akademie school trip to Basel, 2007",
      "confidenceLevel": "documented-fact"
    },
    {
      "claim": "First exhibited at the Gerrit Rietveld Akademie, before the Christmas break, 2007 — printed on A3 sheets",
      "confidenceLevel": "documented-fact"
    },
    {
      "claim": "A Collector's print copy was later exhibited in Amsterdam, at a separate exhibition",
      "confidenceLevel": "documented-fact"
    },
    {
      "claim": "That copy was sold at auction by the artist directly, at the Amsterdam exhibition",
      "confidenceLevel": "documented-fact"
    }
  ],
  "artism:relatedWork": [
    {
      "relationshipType": "derivative-oil-painting",
      "description": "A related oil painting interpretation exists — a Da Fen collaboration work, catalogued independently of this digital edition."
    }
  ],
  "additionalProperty": [
    { "@type": "PropertyValue", "propertyID": "artism:intent", "name": "Intent", "value": "The square format was chosen because..." },
    { "@type": "PropertyValue", "propertyID": "artism:formalContributionAssessment", "name": "Formal Contribution Assessment", "value": "Basel Switzerland establishes the formal and conceptual DNA..." }
  ]
}
```

---

## Verification checklist

- [ ] `artism:editionTierSpec` outputs for all published artworks with `hasEditions !== 'none'`
- [ ] `artism:editionTierSpec` reads spec through `seriesEditionTier` relation when populated, falls back to local fields
- [ ] No `vendureProductId`, `vendureVariantId`, `editionsRemaining`, or price fields appear in JSON-LD
- [ ] `artism:editionClaimSummary` computed from `copies[]`, never from `editionsRemaining`
- [ ] `artism:provenanceClaims` outputs only `documented-fact` and `credible-inference` entries — never `institutional-assertion` or `speculation`
- [ ] `evidenceBasis` never appears in JSON-LD output
- [ ] `artism:originalEditionSize` and `artism:originalEditionApCount` output only when `isOriginalTier === true` tier exists
- [ ] `artism:relatedWork` outputs only when `relatedWorks[]` is populated
- [ ] All existing JSON-LD output from `artwork-page-directive.md` is unchanged

---

*Artwork Page JSON-LD Update · June 2026*
*Extends: artwork-page-directive.md*
*Read alongside: print-data-architecture-reference-v2.md, artism-vocabulary.md*

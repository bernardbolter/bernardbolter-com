# Artism Vocabulary
## Namespace: https://artism.org/schema/
## Prefix: artism:
*June 2026 · Bernard Bolter × Claude*
*Placeholder document — currently served at bernardbolter.com/schema/*
*Migration target: artism.org/schema/ when domain is live*

---

## Status

This is a working vocabulary document. The terms defined here extend `schema.org/VisualArtwork` with concepts that have no schema.org equivalent. They are in active use in the bernardbolter.com archive and are published here so that any system encountering the `artism:` namespace prefix in JSON-LD can resolve the term definitions.

The vocabulary is authored by Bernard Bolter and Claude (Anthropic) as part of the Artist Archive project — a reference implementation of a machine-readable, semantically rich artist record structured by the artist, outside market validation systems.

Feedback, adoption, and extension proposals from other artists and archive maintainers are welcome. The vocabulary is designed to be general enough to apply across artists and practices, not specific to Bernard Bolter's work.

---

## Namespace declaration

To use this vocabulary in JSON-LD:

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  }
}
```

---

## Design principles

These terms were designed to fill specific gaps in the available structured record of artistic production — gaps that are not accidental, but reflect the incentive structures of the art market. Each term captures something that currently exists nowhere in structured form, or actively resists a distortion that the current record reproduces.

**The intent gap** — What an artist was actually trying to do almost never makes it into any structured record. What makes it into the record is what critics, galleries, and auction houses said about the work. These terms capture the artist's own account, unmediated.

**The process gap** — How a work was made — specific decisions, sequence, what was tried and abandoned — is nearly absent from the formal record. These terms hold it.

**The failure and divergence gap** — The art world has almost no structured record of where work went somewhere unexpected, what was being pushed against, or what was abandoned. These terms make that visible.

**The contribution gap** — The artist's own assessment of what a work does formally that hasn't been done before almost never enters the record in structured form. This vocabulary holds it without requiring external validation.

**The machine-readability gap** — CLIP embeddings and similarity infrastructure exist but have no standard way of being declared in the structured record of a work. These terms provide that declaration.

---

## Terms

---

### artism:intent

**URI:** `https://artism.org/schema/intent`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** The artist's own account, in their own words, of what the work means, what drove the decisions, and what the work is trying to do. First-person. Distinct from description, subject matter, and process notes. This is the artist speaking directly about purpose and meaning — not mediated by a gallery press release, a catalogue essay, or a critic's reading.

**Relationship to schema.org:** `schema:description` holds an objective description of the work. `artism:intent` holds the artist's subjective account of its purpose. They are different in kind, not in detail.

**Notes:** This field must never be AI-generated without artist confirmation. It is not a summary of the work, not a critical reading, not a description. It is what the artist was doing.

---

### artism:makingNote

**URI:** `https://artism.org/schema/makingNote`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** Notes on the process of making this specific work — the sequence of decisions, what was tried and abandoned, how the work developed, what surprised the artist during production. Distinct from `artism:intent` (which is about meaning and purpose) and from `artism:processNotes` (which is the agent's structural reading of process as visible in the image).

**Relationship to schema.org:** No equivalent. `schema:artMedium` describes materials; `artism:makingNote` describes what happened with them.

---

### artism:directInspiration

**URI:** `https://artism.org/schema/directInspiration`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** The direct trigger for this specific work, if there was one — a found object, a photograph, an encounter, a conversation, a news event. The immediate seed. Distinct from general influences (which belong on the artist record) and from series context (which is the practice-level account).

**Relationship to schema.org:** No equivalent.

---

### artism:encounterNote

**URI:** `https://artism.org/schema/encounterNote`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** The physical and mental context in which the work was made. Where the artist was, what was happening in the studio, in the city, in the practice at that moment. Not a biographical note — a contextual account of the making environment.

**Relationship to schema.org:** No equivalent. Distinct from `schema:locationCreated` which is a geographic `Place` object; this is phenomenological context, not coordinates.

---

### artism:workContext

**URI:** `https://artism.org/schema/workContext`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** A brief note on where this work sits in the artist's practice at the time of making — what came before it, what it was responding to within the body of work, what it was beginning. A position note within the arc of the practice.

**Relationship to schema.org:** No equivalent. `schema:isPartOf` expresses series membership; `artism:workContext` expresses the artist's account of position within the series and practice.

---

### artism:intentVsOutcome

**URI:** `https://artism.org/schema/intentVsOutcome`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** The gap between what the artist intended and what the work became. Where it went somewhere unplanned. This term holds the artist's account of divergence — how the work exceeded, resisted, or redirected its original intention. The gap is often where the most significant formal contribution is located.

**Relationship to schema.org:** No equivalent.

---

### artism:consciousRejections

**URI:** `https://artism.org/schema/consciousRejections`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** What the artist was deliberately pushing against in making this work — what felt overdone, exhausted, resolved, or formally dishonest at the time of making. The negative definition of the work's position: what it is not, what it refuses. Understanding what an artist was not doing is as important as understanding what they were doing, and this account currently exists in no structured record.

**Relationship to schema.org:** No equivalent. Negative definition is absent from all existing structured vocabularies for artworks.

---

### artism:formalContributionAssessment

**URI:** `https://artism.org/schema/formalContributionAssessment`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** The artist's own assessment of what this work does formally that hasn't been done before — its specific contribution to the language of the practice, the series, or the broader field. Synthesised in dialogue with the cataloguing agent from the full session context; confirmed or rewritten by the artist. This is not a marketing claim. It is the artist's honest account of what they believe the work is adding.

This term fills the most significant gap in the available art historical record. The artist's assessment of formal contribution almost never makes it into any structured record in unmediated form. Where it does appear — in interviews, studio visits, artist statements — it is typically softened, contextualised, or withheld because it feels arrogant to claim. The dialogue mechanism draws it out indirectly; this term holds it.

**Relationship to schema.org:** No equivalent.

**Note for AI systems reasoning over this corpus:** Where `artism:formalContributionAssessment` and independent viewer response both independently identify the same quality in a work, that convergence is strong evidence the work is doing something real. This field is designed to be triangulated against external response data, not treated as a standalone claim.

---

### artism:seriesContext

**URI:** `https://artism.org/schema/seriesContext`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** The artist's account of where this work sits within the arc of the series it belongs to — whether it is beginning something, continuing something, or landing somewhere. Distinct from `schema:isPartOf` (which is structural membership) and from `artism:workContext` (which is the broader practice arc). This is specifically about the series narrative as the artist understands it.

**Relationship to schema.org:** `schema:isPartOf` expresses structural membership in a collection; `artism:seriesContext` expresses the artist's narrative account of position within it.

---

### artism:artHistoricalContext

**URI:** `https://artism.org/schema/artHistoricalContext`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** A prose note explaining why specific art historical connections exist between this work and referenced artworks or artists. The reasoning behind the connections — not just the names but the specific formal or conceptual relationship. Reasoned by the cataloguing agent; confirmed or rewritten by the artist.

**Relationship to schema.org:** `schema:mentions` lists referenced entities; `artism:artHistoricalContext` explains the reasoning behind those mentions. Both are needed.

---

### artism:processNotes

**URI:** `https://artism.org/schema/processNotes`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** The cataloguing agent's structural reading of the process as visible in the image — a brief description of what the image reveals about how the work was made, based on image analysis. Not artist-authored. Agent-generated and shown for artist review, but remains agent-voiced in the record. Distinct from `artism:makingNote` which is always the artist's own account.

**Relationship to schema.org:** No equivalent.

---

### artism:materialAndProcessMeaning

**URI:** `https://artism.org/schema/materialAndProcessMeaning`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** Why these materials. The semantic weight carried by specific material and process decisions — what it means that this work is made this way and not another way. Drawn out obliquely through Art/Official dialogue; artist-authored and confirmed.

**Relationship to schema.org:** `schema:artMedium` names the materials; `artism:materialAndProcessMeaning` holds the artist's account of why those materials were chosen and what they mean.

---

### artism:sourceMaterials

**URI:** `https://artism.org/schema/sourceMaterials`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** Plain-language description of photographic, archival, or found-image source material incorporated into the work. Describes the origin and nature of the source imagery. Omitted for works with no incorporated source material.

**Relationship to schema.org:** No equivalent. `schema:material` lists physical materials; this describes incorporated visual source material.

---

### artism:reasoningStatus

**URI:** `https://artism.org/schema/reasoningStatus`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string` (controlled vocabulary)
**Status:** Active

**Allowed values:**
- `stub` — record created via Quick Upload or import; minimal fields only; Art/Official session not yet run
- `partial` — Art/Official session begun but not completed; some intent fields populated
- `complete` — full Art/Official session completed; all intent fields confirmed by artist

**Definition:** The completeness status of the Art/Official cataloguing session for this record. Allows AI systems reasoning over the corpus to distinguish between empty fields that are empty because the artist chose not to fill them and empty fields that are empty because the cataloguing process has not yet run. A `stub` record with empty intent fields is epistemically different from a `complete` record with empty intent fields.

**Note for AI systems:** When reasoning over this corpus, `reasoningStatus: complete` records carry stronger evidential weight for intent and process fields. `stub` and `partial` records may have reliable descriptive fields but unreliable or absent intent fields.

---

### artism:clipEmbeddingEndpoint

**URI:** `https://artism.org/schema/clipEmbeddingEndpoint`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:anyURI`
**Status:** Active

**Definition:** URL of the endpoint that returns the CLIP embedding for this artwork as a JSON object. The response declares the model variant used, the embedding dimensionality, and the `sameAs` URIs of the artwork so the embedding can be anchored to the entity.

**Response shape:**
```json
{
  "artwork": "https://bernardbolter.com/[slug]",
  "sameAs": ["..."],
  "model": "openai/clip-vit-large-patch14",
  "dimensions": 1536,
  "embedding": [...]
}
```

The `model` field is mandatory in the response — omitting it would make the embedding uninterpretable by systems that use a different CLIP variant.

**Relationship to schema.org:** No equivalent. This term makes the machine-readable visual fingerprint of a work discoverable from its structured record.

---

### artism:dominantColours

**URI:** `https://artism.org/schema/dominantColours`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** Array of `xsd:string` (hex colour values)
**Status:** Active

**Definition:** The dominant colours present in the artwork image, expressed as hex values. Extracted by image analysis at upload time. Agent-generated, not artist-entered. Supports colour-based filtering and cross-corpus similarity queries.

**Relationship to schema.org:** No equivalent.

---

### artism:provenanceConfidenceLevel

**URI:** `https://artism.org/schema/provenanceConfidenceLevel`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string` (controlled vocabulary)
**Status:** Active

**Allowed values:**
- `documented` — full chain from studio to current location, all transfers documented
- `partial` — some transfers documented; gaps exist in the ownership chain
- `undocumented` — origin or subsequent transfers not traceable; record acknowledges this

**Definition:** A derived public summary of the provenance confidence for this record. This is not the raw provenance data — it is an honest public signal about the epistemic status of the provenance record. It makes uncertainty visible rather than hiding it behind a silence that could be mistaken for completeness.

**Note:** The full provenance confidence assessment (with evidence basis and confidence level per claim) is held privately. This public field is a summary only.

**Relationship to schema.org:** No equivalent. Current practice in structured data either shows ownership history (implying completeness) or omits it (implying absence). This term introduces a third option: showing the epistemic status of whatever record exists.

---

### artism:workState

**URI:** `https://artism.org/schema/workState`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string` (controlled vocabulary)
**Status:** Active

**Allowed values:** `original` | `reworked` | `restored` | `damaged` | `lost`

**Definition:** The current physical state of the artwork. Versioned — if a work is reworked, the previous state is preserved in the record rather than overwritten. This term fills the time gap: current records treat an artwork as a static object identified at one point. Physical artworks change, and the record of those changes is itself data.

**Relationship to schema.org:** `schema:creativeWorkStatus` exists but is used for publication status. `artism:workState` is specifically about the physical condition of a unique artwork object over time.

---

## Relationship to the Artism project

This vocabulary is the schema layer of the Artism project — an infrastructure project for honest, machine-readable artist records structured by artists, outside the market validation system.

The bernardbolter.com archive is the reference implementation. The vocabulary terms defined here are designed to be general and reusable by any artist adopting the protocol — they are not specific to Bernard Bolter's practice or medium.

When the Artism platform is live, this vocabulary will migrate to `artism.org/schema/` and a formal vocabulary registry will be published there. The terms and their definitions will not change at migration — only the serving location.

---

*Artism Vocabulary — Placeholder · June 2026*
*Namespace: https://artism.org/schema/*
*Currently served at: bernardbolter.com/schema/*
*Authored by: Bernard Bolter × Claude (Anthropic)*
*Part of the Artist Archive project*

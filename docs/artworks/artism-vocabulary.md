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

## Corpus traversal terms

These terms describe the machine archive API — how responses locate themselves on the scope × depth matrix, and how triage fields declare their provenance. They appear on `schema:DataFeed` envelopes and, where noted, on individual `schema:VisualArtwork` records. They ship with the July 2026 corpus tier-depth pass.

The scope × depth matrix (not a single ladder):

| | gist | survey | record | sessions |
|---|---|---|---|---|
| **corpus** | Tier 1 index | — | root bulk feed | — |
| **subset** | filtered index | Tier 2 survey | — | — |
| **work** | *(deferred)* | — | Tier 4 record | Tier 5 sessions |

`artism:tier` is shorthand for the four addresses that sit on the ladder. The root feed occupies corpus × record and is **not** a rung — it omits `artism:tier` and declares `artism:feedRole: bulk-export` instead. An absent key means no such thing here (same rule as `artism:availableTiers`).

---

### artism:scope

**URI:** `https://artism.org/schema/scope`
**Type:** `rdf:Property`
**Domain:** `schema:DataFeed`, `schema:VisualArtwork`
**Range:** `xsd:string` (controlled vocabulary)
**Status:** Active

**Allowed values:**
- `corpus` — the whole published archive (or an unfiltered corpus-level endpoint)
- `subset` — a filtered or narrowing set of works
- `work` — a single artwork

**Definition:** Horizontal axis of a corpus response: how many works the payload addresses. Orthogonal to `artism:depth`. Together they locate a response in the scope × depth matrix without requiring a reader to have learned the tier numbering.

**Relationship to schema.org:** No equivalent. Distinct from `schema:about` (topic) and from pagination counts — this is the addressing grain of the response itself.

---

### artism:depth

**URI:** `https://artism.org/schema/depth`
**Type:** `rdf:Property`
**Domain:** `schema:DataFeed`, `schema:VisualArtwork`
**Range:** `xsd:string` (controlled vocabulary)
**Status:** Active

**Allowed values:**
- `gist` — triage identity: series, catalogue number, one-sentence gist
- `survey` — narrowing fields: description, intent line, colours, keywords (same word as `?depth=survey`)
- `record` — full artwork JSON-LD including all vision analyses
- `sessions` — completed session transcripts for one work

**Definition:** Vertical axis of a corpus response: how much is said about each addressed work. The controlled values are identical to the query vocabulary — a machine that reads `"artism:depth": "survey"` may request `?depth=survey` and succeed. There is no separate synonym.

**Relationship to schema.org:** No equivalent. Not `schema:description` (content) and not HTTP content negotiation — this names which field set the archive chose to emit.

---

### artism:feedRole

**URI:** `https://artism.org/schema/feedRole`
**Type:** `rdf:Property`
**Domain:** `schema:DataFeed`
**Range:** `xsd:string` (controlled vocabulary)
**Status:** Active

**Allowed values:**
- `bulk-export` — paginated full-record dump of the corpus; corpus × record cell; not a ladder rung

**Definition:** Declares a specialised role for a DataFeed that is not one of the tier-ladder addresses. Present when `artism:tier` is omitted. Extensible — additional roles may be added when a new non-ladder feed appears; do not overload `artism:tier` for those cases.

**Relationship to schema.org:** No equivalent. Complements `schema:DataFeed` by saying *why* this feed exists when it is not a triage/survey/record/sessions rung.

---

### artism:tier

**URI:** `https://artism.org/schema/tier`
**Type:** `rdf:Property`
**Domain:** `schema:DataFeed`, `schema:VisualArtwork`
**Range:** `xsd:integer`
**Status:** Active

**Allowed values:** `1` | `2` | `4` | `5`

**Definition:** Shorthand for the four public ladder addresses. Maps onto the scope × depth matrix as: `1` = corpus|subset × gist; `2` = subset × survey; `4` = work × record; `5` = work × sessions. Tier `3` (work × gist, preferred vision analysis alone) is deferred and must not be emitted. Omit the key entirely when the response is not a ladder rung (see `artism:feedRole`) — do not emit `null`.

**Relationship to schema.org:** No equivalent. Prefer `artism:scope` + `artism:depth` for machines that have not learned the numbering; keep `artism:tier` for compact human and agent shorthand.

---

### artism:tierMap

**URI:** `https://artism.org/schema/tierMap`
**Type:** `rdf:Property`
**Domain:** `schema:DataFeed`, `schema:VisualArtwork`
**Range:** JSON object whose keys are the active tier numbers (`"1"`, `"2"`, `"4"`, `"5"`), each value an object with `url` or `urlTemplate`, `scope`, `depth`, and `description`
**Status:** Active

**Definition:** Self-description of the public ladder from any single corpus response. A cold arrival at one URL learns the other addresses from this block. Keys follow the same absence rule as `artism:availableTiers`: do not include `"3"` while that rung is unbuilt. Nested `scope` / `depth` use the same controlled values as `artism:scope` / `artism:depth`.

**Relationship to schema.org:** No equivalent. Related in spirit to site maps and `schema:EntryPoint`, but specific to this archive's depth ladder.

---

### artism:availableTiers

**URI:** `https://artism.org/schema/availableTiers`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** JSON object with boolean values keyed by tier number string
**Status:** Active

**Definition:** Which ladder rungs hold content for this specific work, computed from field presence (not from `artism:reasoningStatus`, which can disagree with the data). Keys: `"1"` and `"4"` are always `true` (triage and record always exist); `"2"` is `true` when description, intent, colours, or tags are present; `"5"` is `true` when at least one completed session references the work. Omit key `"3"` entirely — an absent key means no such rung; `false` means the rung exists but is empty for this work.

**Relationship to schema.org:** No equivalent. Prevents a machine from spending requests on empty depths.

---

### artism:gist

**URI:** `https://artism.org/schema/gist`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string`
**Status:** Active

**Definition:** One-sentence triage prose for a work at gist depth. Boundary-aware truncated. Always paired with `artism:gistSource` when non-null so a reader can weigh whether the sentence is artist-authored or model-derived.

**Relationship to schema.org:** Narrower than `schema:description`. A gist is explicitly triage-length and provenance-tagged; `schema:description` is the fuller account.

---

### artism:gistSource

**URI:** `https://artism.org/schema/gistSource`
**Type:** `rdf:Property`
**Domain:** `schema:VisualArtwork`
**Range:** `xsd:string` (controlled vocabulary pattern)
**Status:** Active

**Allowed values:**
- `artist:descriptionShort` — first sentence of the artist's short description
- `artist:intentLine` — the artist's intent field, used whole when ≤ 200 characters
- `vision:{model}` — first sentence of the preferred vision analysis, where `{model}` is the concrete model id (e.g. `vision:claude-sonnet-4-6`, `vision:moondream-station`)

**Definition:** Provenance of `artism:gist`. Precedence is artist prose before vision analysis: `descriptionShort` → short `intent` → preferred vision analysis. This field is what lets an outside reader tell whether a triage sentence is the archive speaking or a blind model guessing. Without it, the gist is an undifferentiated string.

**Relationship to schema.org:** No equivalent. Related in spirit to provenance / `schema:creator` of a *statement*, not of the artwork.

---

### artism:coverage

**URI:** `https://artism.org/schema/coverage`
**Type:** `rdf:Property`
**Domain:** `schema:DataFeed`
**Range:** JSON object
**Status:** Active

**Definition:** Composition of the **matched** set on a list response (not the whole corpus unless the query is unfiltered). Typical keys: `matched`, `withArtistIntent`, `withVisionAnalysis`, `withSessions`, `reasoningComplete`. On Tier 5 feeds, may be `{ "sessionCount": N }`. Discloses selection bias: works with sessions and artist intent read as richer; coverage makes that visible so documentation effort is not mistaken for significance.

**Relationship to schema.org:** Distinct from `schema:spatialCoverage` / `schema:temporalCoverage` (subject matter). This is meta-coverage of the archive's own field completeness for the current query.

---

### artism:urlTemplates

**URI:** `https://artism.org/schema/urlTemplates`
**Type:** `rdf:Property`
**Domain:** `schema:DataFeed`
**Range:** JSON object of string templates with `{slug}` substitution only
**Status:** Active

**Definition:** Published once on the Tier 1 index envelope so per-record derived URLs need not be repeated across hundreds of triage rows. Keys include `page`, `record`, `visionPage`, `sessions` (machine endpoint), and `sessionsPage` (human HTML). Substitution variable is `{slug}` only — no nesting. At survey and record depth, absolute URLs may still be emitted inline where payload pressure is lower.

**Relationship to schema.org:** Related to `schema:url` / `schema:EntryPoint` templates; specific to this archive's slug-keyed address space.

---

## Relationship to the Artism project

This vocabulary is the schema layer of the Artism project — an infrastructure project for honest, machine-readable artist records structured by artists, outside the market validation system.

The bernardbolter.com archive is the reference implementation. The vocabulary terms defined here are designed to be general and reusable by any artist adopting the protocol — they are not specific to Bernard Bolter's practice or medium.

When the Artism platform is live, this vocabulary will migrate to `artism.org/schema/` and a formal vocabulary registry will be published there. The terms and their definitions will not change at migration — only the serving location.

---

*Artism Vocabulary — Placeholder · July 2026*
*Namespace: https://artism.org/schema/*
*Currently served at: bernardbolter.com/schema/*
*Authored by: Bernard Bolter × Claude (Anthropic)*
*Part of the Artist Archive project*

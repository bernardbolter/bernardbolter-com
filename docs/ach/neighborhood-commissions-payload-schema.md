# Neighborhood Commissions — Payload Schema
## Global · AchNeighborhoodSources · Artworks.ach.neighborhoodCommission

*Aug 25 2026 · Supports acolorfulhistory.com `/neighborhood` (page designed in the ACH repo; data lives here)*

Read alongside: `docs/handoff-ach-schema-extension.md.txt` · ACH brief `ach-neighborhood-commissions-page-brief.md` (acolorfulhistory.com)

---

## How to read this document

Three surfaces feed the Neighborhood Commissions offering:

1. **Global `neighborhood-commissions`** — page pitch, founding-batch pricing, proof links (offering config, not artwork data).
2. **Collection `ach-neighborhood-sources`** — Tier 1 curated unpainted SF (later: multi-city) historical photos.
3. **`Artworks.ach.neighborhoodCommission`** — Tier 2 flags on existing painted ACH works (revisited subjects / proof roles).

**Layer key** — identical to the archive schema:

- `artist` — entered / confirmed by Bernard
- `agent` — computational or lookup; shown for review
- `private` — role-restricted (`artist` / `admin`); never in public API response

**Field type key:** CORE · COMPUTED · RELATIONAL · INTENT · SYSTEM

**City slug:** every inventory and artwork flag carries `city` (default `san-francisco`) so a future ACH route `/neighborhood/[city]` can filter without a schema break. Do not invent per-city collections until a second city exists.

---

## Part 1 — Global `neighborhood-commissions`

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `active` | checkbox | artist | SYSTEM | When off, ACH should hide or soft-close the offering. |
| `city` | select | artist | CORE | Primary city for this offering instance. Default `san-francisco`. |
| `foundingBatchSize` | number | artist | CORE | Size of founding batch (5). |
| `foundingBatchPriceUsd` | number | artist | CORE | Direct/newsletter founding price (1800). |
| `foundingBatchSizeLabel` | text | artist | CORE | Display size, e.g. `36"×36"`. |
| `foundingSlotsRemaining` | number | artist | CORE | Artist-maintained remaining founding slots. |
| `pageTitle` | text, localized | artist | CORE | Nav/page title — “Neighborhood Commissions.” |
| `eyebrow` | text, localized | artist | CORE | Series framing — “A Colorful History.” |
| `pitch` | textarea, localized | artist | INTENT | Core offer pitch. |
| `berlinFrame` | textarea, localized | artist | INTENT | Berlin / SF home differentiator. |
| `archiveCredibility` | textarea, localized | artist | INTENT | Archive-as-evidence trust copy. |
| `tier1Intro` | textarea, localized | artist | INTENT | Browse unpainted photos. |
| `tier2Intro` | textarea, localized | artist | INTENT | Revisited subjects (photo has history, painting doesn’t). |
| `tier3Intro` | textarea, localized | artist | INTENT | Fully custom research. |
| `foundingBatchFraming` | textarea, localized | artist | INTENT | “Founding collectors — first five…” |
| `artspanEvent` | relationship → events | artist | RELATIONAL | ArtSpan Selections 2017 (Piece B deep link). |
| `designerCommissionNote` | textarea, localized | artist | INTENT | Piece A without install photo. |
| `privatePricingNotes` | group (private) | artist | CORE | Designer/agent rates and post-founding expectations — staff only. |

Access: `read: () => true`, `update: artistOrAdmin`. Fields inside `privatePricingNotes` use `privateFieldAccess`.

---

## Part 2 — Collection `ach-neighborhood-sources` (Tier 1)

Public browse inventory of sourced-but-not-yet-painted neighborhood photographs. Metadata mirrors `ach.sourcePhotograph` so a completed commission can copy into an Artwork without a second vocabulary.

### Inventory / visibility

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `published` | checkbox | artist | SYSTEM | ACH visibility. Anonymous API only returns `published: true`. |
| `status` | select | artist | CORE | `available` \| `held` \| `commissioned` \| `painted`. |
| `city` | select | artist | CORE | Default `san-francisco`. |
| `neighborhood` | text | artist | CORE | District / neighbourhood label (Sunset, Mission, …). |
| `sortOrder` | number | artist | SYSTEM | Manual ordering in Tier 1 grid. |
| `resultingArtwork` | relationship → artworks | artist | RELATIONAL | Set when a commission is completed. |

### Source photograph metadata (mirror of `ach.sourcePhotograph`)

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `sourceImage` | upload → media | artist | CORE | Historical photograph file. |
| `sourceImageAltText` | text, localized | artist | CORE | Alt text. |
| `sourceTitle` | text, localized | artist | CORE | Title as known in archive/catalogue. |
| `sourceCreator` | text | artist | CORE | Photographer or institution. |
| `sourceCreatorWikidataUri` | text | agent | RELATIONAL | Wikidata for creator. |
| `approximateDate` | text | artist | CORE | Human-readable date. |
| `imageCaptureType` | relationship → image-capture-technologies | artist | RELATIONAL | Capture technology. |
| `sourceWikidataUri` | text | agent | RELATIONAL | Wikidata for this photograph. |
| `sourceWikimediaCommonsUrl` | text | agent | RELATIONAL | Commons file-page URL. |
| `sourceInstitution` | text | artist | CORE | Holding archive/museum/library. |
| `sourceInstitutionWikidataUri` | text | agent | RELATIONAL | Wikidata for institution. |
| `sourceInstitutionUrl` | text | artist | RELATIONAL | Catalogue record URL. |
| `sourceLicense` | select | artist | CORE | cc0 / cc-by / cc-by-sa / public-domain / other. |
| `sourceLicenseUrl` | text | artist | RELATIONAL | License URL. |
| `sourceCredit` | text | artist | CORE | Attribution string for display. |

Access: anonymous read constrained to `{ published: { equals: true } }`; create/update/delete artistOrAdmin.

Admin `useAsTitle`: `sourceTitle` (fallback display via neighborhood in default columns).

---

## Part 3 — `Artworks.ach.neighborhoodCommission` (Tier 2)

On the ACH tab only (`seriesSlug === 'a-colorful-history'`). Existing works already hold source photos; this group adds commission-page eligibility and proof roles.

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `revisitedSubjectAvailable` | checkbox | artist | SYSTEM | Include in ACH Tier 2 list. |
| `city` | select | artist | CORE | Same city vocabulary as sources. |
| `proofRoles` | select, hasMany | artist | CORE | `designer-home` \| `artspan-juried` \| `auction-resale` \| `follow-on-commission`. |
| `proofNote` | textarea, localized | artist | INTENT | e.g. designer line when no install photo. |
| `priorSubjectArtwork` | relationship → artworks | artist | RELATIONAL | Earlier painting of the same subject, if catalogued. |
| `neighborhoodSource` | relationship → ach-neighborhood-sources | artist | RELATIONAL | Source inventory row if inventoried first. |

---

## City vocabulary (shared)

| Value | Label |
|---|---|
| `san-francisco` | San Francisco |

Add values when a second city is real — not before.

---

## Content checklist (after schema lands)

Not part of the schema implement pass:

- [ ] Flag `lombard-street-1922-v2` Tier 2 + `artspan-juried` (+ auction when documented)
- [ ] Flag `baker-beach-1935` if used as related proof
- [ ] Point Global `artspanEvent` at `artspan-selections-2017-heron-arts`
- [ ] Fill founding-batch copy defaults from the content brief
- [ ] Seed Tier 1 source rows when curated photos are ready

---

## Explicit non-goals

- ACH `/neighborhood` UI, nav, i18n
- Commission intake / brief submission collection
- Vendure deposit product
- Per-city routing scaffolding
- Auto-assembly hook for `sourceCredit` (manual for now; Artwork ACH may still auto-generate on painted works)

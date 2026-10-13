# Mediums of War Stub Records — Fix Addendum
## bernardbolter.com · Payload data + schema companion
*27 August 2026 · Cursor investigate-then-fix pass*

**Status:** applied to live Payload (Netcup). This is a data/shape pass, not an artwork-page UI build.

Named source briefs (`ach-schema-and-build.md`, `schema-summary.md`, `handoff-mop-series-triptych.md`, `brief-01-artwork-page-design.md`, `claude_addendum-artwork-page-cursor-audit.md`) are **not in this repo**. Field definitions were read from `docs/handoff-ach-schema-extension.md.txt` (Part 1 + Part 2 Groups 1–7), live `src/collections/Artworks.ts` / `Triptychs.ts`, and `docs/artworks/artwork-page-directive.md`. Treat `brief-06-homepage-nav-revamp.md` §4 (“Mediums of War” as a top-level Series nav item) as **stale** — do not restore a standalone MoW nav entry.

---

## Step 1 — Investigation findings (before change)

### Three stubbed Artwork records

Bernard’s stubs were created 27 August 2026. Exact titles/slugs:

| id | title | slug | created |
|---|---|---|---|
| 242 | **World War One** | `world-war-one` | 2026-08-27T11:56:30Z |
| 243 | **World War Two** | `world-war-two` | 2026-08-27T11:56:56Z |
| 245 | **Vietnam War in Video Stills** | `vietnam-war-in-video-stills` | 2026-08-27T12:01:50Z |

These are **not** titled “WWI in Black and White” / “WWII in Color” / “Vietnam”. Titles were left as Bernard stubbed them.

Shared stub facts (all three, before and after unless noted):

- `status`: `published`
- `reasoningStatus`: `stub`
- `medium`: `acrylic-photo-transfer-on-canvas`
- `sizeTier`: `xl`, `orientation`: `square`, 80 × 80 cm
- `city` / `country`: null
- base `availabilityStatus`: `available` (archive field — not the ACH Group 7 field)
- `arEnabled` (base model-viewer field): `false`

### Series tagging (the important finding)

A **Mediums of War Series document already exists** and is **orphaned**.

| Series | id | slug | status | parent | artworks tagged (before) |
|---|---|---|---|---|---|
| Mediums of Perception | 2 | `mediums-of-perception` | published | A Colorful History (1) | Vietnam only |
| Mediums of War | 3 | `mediums-of-war` | **published** | A Colorful History (1) | **none** |
| A Colorful History | 1 | `a-colorful-history` | published | — | World War One, World War Two |

- World War One / World War Two were tagged to **A Colorful History**, not Mediums of War.
- Vietnam was already tagged to **Mediums of Perception**.
- **Zero artworks** pointed at Series id 3. The MoW Series record is leftover from `src/scripts/seed-series.ts` (published child of ACH). It was not deleted. Bernard’s call: unpublish, delete, or keep as a dormant slug.

`src/scripts/seed-series.ts` still lists `mediums-of-war` as a published ACH child. Re-running that seed will keep the orphan alive.

### Triptych records (before)

- **No Mediums of War Triptych existed.**
- One unrelated draft existed: `ACH Vendure Seed Triptych (sample)` (`ach-vendure-seed-sample`, id 1) — Brandenburg Gate / Checkpoint Charlie / Reichstag. Untouched.

Live `Triptychs` collection had **no `discoverable` field**, despite schema-summary’s “False for MoW” line. Also absent (named in the target shape, not in live schema): `mapPresence`, `arUrl`, `videos[]`, `concept`, `featuredOrder`, `year` (the collection has `yearStart` / `yearCompleted` instead). Artwork has **no parent `triptych` relation** — membership is `Triptychs.panels[]` plus `ach.mop.triptychPosition`. `ach.mop.relatedTriptychs` is editorial-only and was left empty.

### Group 1–7 baseline (all three, before)

| Group | Field | Before |
|---|---|---|
| 1 | `mapPresence` | `false` |
| 1 | `lat` / `lng` | null |
| 1 | `cityPlaceholderColor` | `#F4F2EE` (fallback — city empty; **already correct**) |
| 1 | `tourSequence` / `grandTour` / `grandTourSequence` / `tourStopCopy` | null / false / null / null |
| 2 | `overlayColors` / `overlayRects` | **empty** — left for Bernard; no hex invented |
| 3 | `sourcePhotographs` / `sourceImage` / capture + credit fields | empty / null |
| 4 | `olderStory` / `newerStory` / `keyHistoricalDates` / location URIs / `conceptCopy` | empty / null |
| 5 | `transferImage` | null |
| 5 | `sliderAxis` | `horizontal` (schema default, even with no transfer image) |
| 6 | `arEnabled` | `false`; marker pending; no videos |
| 7 | `triptychPosition` / `imageCaptureType` / `imageCaptureLabel` / `availabilityStatus` / `relatedTriptychs` | all unset / empty |

ImageCaptureTechnologies vocabulary was the original 11 slugs. No `color-photograph` or `video-16mm-film`.

---

## What changed

### Vocabulary (Step 2)

Added via `src/scripts/seed-image-capture-technologies.ts`:

| id | slug | name | period start | notes |
|---|---|---|---|---|
| 12 | `color-photograph` | Color photograph | 1935 (Kodachrome) | WWII panel II |
| 13 | `video-16mm-film` | Video / 16mm film | 1965 | Vietnam panel III |

Slug `video-16mm-film` was chosen because Vietnam-era moving-image sources mixed **16mm news film and television video**. Naming one and not the other would be an inference. Flag if Bernard wants `16mm-film`, `television`, or a split vocab later.

### Artwork records (Step 3)

All three now:

- `series` → Mediums of Perception (`mediums-of-perception`, id 2)
- `seriesSlug` → `mediums-of-perception`
- `ach.mapAndTour.mapPresence` `false`, `lat`/`lng` null (already were)
- `ach.ar.arEnabled` `false`
- `ach.mop.relatedTriptychs` empty
- Membership in the MoW set is via the new Triptych’s `panels[]` (Artwork has no `triptych` field to set)

Per panel:

| Artwork | `triptychPosition` | `imageCaptureType` | `imageCaptureLabel` | `ach.mop.availabilityStatus` |
|---|---|---|---|---|
| World War One | `I` | **null** (Bernard’s call: dry plate vs glass plate vs press photography) | `[PLACEHOLDER] Black and white photography, WWI-era` | `original-available` **[guess]** |
| World War Two | `II` | → `color-photograph` (id 12) | `[PLACEHOLDER] Color photograph, WWII-era` | `original-available` **[guess]** |
| Vietnam War in Video Stills | `III` | → `video-16mm-film` (id 13) | `[PLACEHOLDER] Video, Vietnam War-era` | `original-available` **[guess]** |

`availabilityStatus: original-available` is a **layout-testing guess**, not a confirmed sale status. Base archive `availabilityStatus` remains `available` (untouched).

### Triptych record (Step 4)

Created:

- id **2**
- `title`: `"Mediums of War"` **[working title]**
- `slug`: `mediums-of-war`
- `series` → Mediums of Perception (id 2)
- `panels`: World War One (I), World War Two (II), Vietnam War in Video Stills (III)
- `discoverable`: `false`
- `status`: `draft` (collection requires a value; used the schema default rather than inventing `published`)
- `city`, `yearStart`, `yearCompleted`: unset
- `printSets`: empty
- `signedAndNumbered`: schema default `true` (not an editorial confirmation)

### Schema companions required for the target shape to hold

1. **`Triptychs.discoverable`** — added (checkbox, default `true`). The field named in schema-summary did not exist on the live collection. SQL: `src/scripts/add-triptych-discoverable-schema.ts`. Existing seed triptych defaults to `true`.
2. **ACH tab visibility** — the A Colorful History tab was gated on `seriesSlug === 'a-colorful-history'` only. Retagging WWI/WWII to MoP would have **hidden Groups 1–7 in admin**, including the Group 7 fields just filled. Condition now also includes `mediums-of-perception`, `mediums-of-war`, and `gates-of-perception`.

### Left untouched (as specified)

- `overlayColors` / `overlayRects` — still empty on all three. Bernard fills via admin after image analysis; no placeholder hex.
- Group 3 source photograph, Group 4 stories/dates, Group 5 transfer/slider — confirmed empty (sliderAxis is only the default). Art/Official session work.
- Titles, years, catalogue numbers, dimensions, primary images.

### `cityPlaceholderColor`

Hook `src/hooks/artworkAch.ts` maps city → hex and falls through to `#F4F2EE` when city is null/empty/unknown. All three had `#F4F2EE` before; still `#F4F2EE` after. No wrong-city inherit. Unit test added for empty/missing city (`tests/unit/artworkAch.spec.ts`).

---

## What’s now confirmed

- MoW is a **nested triptych under Mediums of Perception**, not a standalone Series for these three paintings.
- The three published stubs are on `mediums-of-perception` and ordered I / II / III on triptych `mediums-of-war`.
- `discoverable: false` is stored on that triptych — the hook for “not in nav, reached via MoP only.”
- Map/AR off; no lat/lng.
- City color fallback is the parchment token, not a Berlin/SF/etc. city color.
- Public ICT API already serves `color-photograph` and `video-16mm-film`.
- The public artwork records remain published (WWI/WWII now appear under `/series/mediums-of-perception` once caches refresh). The **triptych itself is draft**, so `/api/triptychs` will not list it until Bernard publishes.

---

## Still open (Bernard)

1. **Orphan Series `mediums-of-war` (id 3)** — published, zero artworks, still seeded. Unpublish / delete / keep? Do not leave it in primary nav if brief-06 is updated; filter UI already excludes sub-series with `parentSeries`.
2. **Triptych `status`** — currently `draft`. Publish when the nested set should be queryable by the artwork page; or keep draft until Art/Official.
3. **Triptych `title` / `slug`** — `"Mediums of War"` / `mediums-of-war` is a working label, not locked.
4. **Triptych editorial blanks** — `city` (a war set has no single city), `yearStart` / `yearCompleted`, `concept` (field does not exist), `featuredOrder` (field does not exist), `printSets` / commerce, `signedAndNumbered` default.
5. **WWI `imageCaptureType`** — still null on purpose.
6. **Sale status** — Group 7 `original-available` is a guess. Real answer needed.
7. **Overlay colours/rects** — empty; Bernard via admin.
8. **Group 3–5** — empty; Art/Official.
9. **Painting titles** — stub titles vs the brief’s “WWI in Black and White / WWII in Color / Vietnam.”
10. **Duplicate `wp_id: 291`** on World War Two and Vietnam (World War One is 290) — stub artifact, out of scope here.
11. **Nav/code that still treats MoW as a Series** — `catalogScope.ts` `ACH_CHILD_SERIES_SLUGS`, Art/Official prompt blocks, Group 7 condition still accepts `mediums-of-war` as a series slug for leftover records. Fine until the Series document is retired.

Live Triptychs still has no `mapPresence` / `arUrl` / `videos[]`. Nothing to clear. Add those fields only when AR/store for triptychs is actually built.

---

## To-confirm checklist (placeholders and guesses)

Scan this instead of hunting Payload admin for what is real:

- [ ] **ICT `color-photograph` description** — `[DRAFT — Bernard to confirm]` Kodachrome / WWII-era note. Wikidata Q182167 is an agent lookup, not confirmed.
- [ ] **ICT `video-16mm-film` name + description** — slug/name choice (video and 16mm together); `[DRAFT — Bernard to confirm]` Vietnam-era moving-image note. Wikidata Q151342 (16 mm film) is an agent lookup; television is a different entity if Bernard wants a split.
- [ ] **WWI `imageCaptureType` left null** — dry plate vs glass plate vs press photography is Bernard’s call.
- [ ] **WWI / WWII / Vietnam `imageCaptureLabel`** — all three strings prefixed `[PLACEHOLDER]`.
- [ ] **`ach.mop.availabilityStatus`: `original-available`** — layout guess, not a confirmed sale status.
- [ ] **Triptych title `"Mediums of War"` and slug `mediums-of-war`** — working values.
- [ ] **Triptych `status: draft`** — schema default, not a publish decision.
- [ ] **Series document Mediums of War (id 3)** — orphaned, still published. Unpublish/delete/keep?

---

## How to re-run

```
npx tsx src/scripts/add-triptych-discoverable-schema.ts
npx tsx src/scripts/seed-image-capture-technologies.ts
npx tsx src/scripts/fix-mow-stub-records.ts
npx tsx src/scripts/verify-mow-stub-records.ts
```

The fix script is idempotent on the three slugs and the `mediums-of-war` triptych slug.

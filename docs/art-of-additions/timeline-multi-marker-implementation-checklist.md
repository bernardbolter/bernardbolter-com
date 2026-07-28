# Timeline Multi-Marker Implementation Checklist (Repo-Mapped)

Source brief: `docs/art-of-additions/timeline-multi-marker-brief.md`

Status labels:
- `[x]` already implemented in repo
- `[ ]` net-new work required
- `[~]` partially present / requires extension

## 0) Repo scan summary (what exists today)

- [x] Existing drag/scroll artwork timeline exists and is active in homepage flow.
  - Renderer: `src/components/artworks/Timeline.tsx`
  - Layout math + timepoints: `src/helpers/timeline.tsx`
  - Provider state + formatting: `src/providers/ArtworkProvider.tsx`
  - Mounted via homepage artwork view: `src/components/artworks/Artworks.tsx`
- [x] Bio/statement accumulation data model exists (from Brief 3).
  - Artist fields: `bioTimelineEntries`, `statementThroughlines`, `historicalBios`, `historicalStatements` in `src/collections/Artists.ts`
  - Public filtering helpers already exist for page rendering in `src/lib/artist/accumulatingEntries.ts`
- [x] Public detail pages already exist for click-through targets.
  - Bio entries: `src/app/(frontend)/bio/entries/[slug]/page.tsx`
  - Throughlines: `src/app/(frontend)/statement/throughlines/[slug]/page.tsx`
  - Historical docs: `src/app/(frontend)/bio/history/[entryId]/page.tsx`, `src/app/(frontend)/statement/history/[entryId]/page.tsx`
- [x] No timeline-extension marker rendering appears to have started yet.
  - No existing `bioEntries` / `throughlines` / `historicalReadings` arrays in timeline provider types or renderer.

## 1) Current timeline data-fetch shape (confirmed)

- [x] Timeline data is currently artwork-only.
  - Root fetch path: `src/lib/payload/layoutData.ts` -> `fetchCatalogueArtworksWithPayload(...)`
  - Artwork select shape: `src/lib/payload/artworks.ts` (`CATALOGUE_ARTWORK_SELECT`)
  - Provider input: `ArtworksProvider` currently accepts only `artworks`, `artist`, `filterSeries` (`src/providers/ArtworkProvider.tsx`)
- [x] Additive second layer (`bioEntries`, `throughlines`, `historicalReadings`) added without replacing artwork feed.

## 2) Brief Part 2.1 — Bio-entry markers (point)

- [x] Extend data layer with a public-only bio entry timeline payload:
  - `eventDate`
  - `text`
  - `linkedArtworkSlugs` (optional)
  - destination links (`/bio/entries/[slug]`, optional source session link)
- [x] Extend timeline view model/types to include marker track items.
- [x] Render a visually subordinate secondary marker track in `Timeline.tsx`.
- [x] Positioning behavior:
  - year/date position from `eventDate`
  - when `linkedArtworkSlugs` exists, place nearest linked artwork position (or fallback to date position if no resolvable artwork anchor)

## 3) Brief Part 2.2 — Throughline rendering (exploratory)

- [x] **First pass only**: implement static two-point connectors.
  - Scope to throughlines where exactly two linked artworks are resolvable in the currently rendered timeline set.
  - Draw straight line segment between the two artwork anchor points.
  - Skip multi-node spline/path logic for now.
- [~] Add minimal interaction state:
  - hover/click endpoint highlights paired connector + endpoints
- [ ] Defer advanced rendering:
  - curves, 3+ node routing, collision avoidance, bundling
- [ ] If throughline visual logic gets complex after first screen test, spin a dedicated follow-up brief for connector/routing strategy.

## 4) Brief Part 2.3 — Historical self-reading markers

- [x] Add historical marker data mapping (bio + statement) from artist record:
  - date
  - type (`bio` vs `statement`)
  - destination href to full historical page
- [x] Render distinct document-style marker (separate from artwork dots and bio mini-markers).
- [x] Link-through only (no inline full text in timeline).

## 5) Public privacy filtering (required)

- [x] Privacy filtering exists for bio/statement page lists and detail routes.
  - `publicBioTimelineEntries(...)`
  - `publicStatementThroughlines(...)`
  - per-slug route guards also check `visibility`.
- [x] Timeline-layer fetch added and includes marker privacy enforcement.
- [x] Add explicit public-only filtering in the new timeline aggregation path:
  - include only `(visibility ?? 'public') === 'public'`
  - never expose private marker rows to homepage timeline payload.

## 6) Build order mapped to repo

- [x] Step 1: Add timeline marker aggregation function in payload layer.
  - Recommended location: `src/lib/payload/layoutData.ts` (or adjacent helper in `src/lib/payload/`)
  - Keep existing artwork fetch untouched; append marker arrays
- [x] Step 2: Extend provider contract/types.
  - `src/types/frontend.ts` and/or `src/types/timlineTypes.ts`
  - `src/providers/ArtworkProvider.tsx` input and state
- [x] Step 3: Render bio marker track in `src/components/artworks/Timeline.tsx`
- [x] Step 4: Render minimal two-point throughline connectors in `src/components/artworks/Timeline.tsx`
- [x] Step 5: Render historical reading markers + link-through
- [ ] Step 6: Visual review pass and iterative tuning (intentionally exploratory)

## 7) Verification checklist (implementation + behavior)

- [ ] Existing artwork drag/scroll/tap behavior unchanged
- [ ] All three new marker types are visually distinct and subordinate to artworks
- [ ] Private entries never appear in public timeline marker layer
- [ ] Marker click-through targets resolve correctly
- [ ] Throughline first pass limited to static two-point links (no over-built routing)

## 8) Follow-up brief triggers

- [ ] Create a follow-up brief **only if needed** for:
  - multi-node throughline connector routing and overlap strategy
  - marker density/decluttering policy at tight year ranges
  - timeline performance strategy if marker counts become large

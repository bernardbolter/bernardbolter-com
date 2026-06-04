# Frontend rebuild — step-by-step build plan

**Goal:** Recreate the public site from `bernard-bolter-sass-old` (≈90% complete, Sass + WordPress/Apollo) inside `bernardbolter-com` (Next.js 16 + Payload + Postgres), using **Tailwind** instead of Sass, with the same look, layout, and behaviour.

**Authority (read in this order before any step):**

| Doc / folder | Role |
|---|---|
| `docs/designFiles/design-system.md` | Tokens, typography, z-index, breakpoints, component patterns, artwork sizing rules |
| `docs/designFiles/design-system-visual.html` | Visual reference — open in browser |
| `.cursor/rules/bernardbolter.mdc` | Hard rules for agents (breakpoints, fonts, artwork hook, read-only legacy folder) |
| `bernard-bolter-sass-old/bernardbolter.com/` | **Read only** — source of behaviour and markup |
| `src/lib/payload/`, `src/providers/`, `src/helpers/`, `src/hooks/` | Current Payload data layer (already started) |

**Out of scope for this plan:** Payload admin, Art/Official, Studio app (`/studio/*`). Those stay as-is.

---

## Current state (snapshot)

| Area | Old site | New repo today |
|---|---|---|
| Data | Apollo → WordPress | Payload `getArtworks()` + `getPerson()` in layout |
| Home | `Info` + `Nav` + `Artworks` (timeline / grid / slideshow) | `Timeline` only — no Info/Nav/switcher/grid/slideshow shell |
| Artwork URL | `/[slug]` | **`/[slug]`** (target) — today stub lives at `/artworks/[slug]` until Phase 4 |
| All-artworks index | `/` (timeline/grid) | `/` — **no** `/artworks` listing page |
| Provider | Full filter/view/dimension state | Minimal stub (`original` / `filtered` / `sorting` only) |
| Styles | 20+ `.scss` partials | Partial `tailwind.config.js`, minimal `global.css` |
| Secondary pages | Bio, CV, Contact, Statement, Datenschutz | CV started (plain list); others missing or minimal |
| Dependencies | `react-masonry-css`, `react-player`, `react-draggable` | Not installed yet |

**Do not rewrite from memory.** Port component-by-component from the old repo and map styles using `design-system.md` Section 14 (token migration map).

---

## URL policy (locked — do not revisit)

| Route | Purpose |
|---|---|
| `/` | Home **and** all-artworks catalog (timeline / grid / slideshow). There is no separate “works index” page. |
| `/{artwork-slug}` | Published artwork detail (same as legacy site + sitemap). |
| `/artworks` | **301 → `/`** — home is the catalog; avoid a dead or duplicate index. |
| `/artworks/{slug}` | **301 → `/{slug}`** — only for dev/bookmarks during migration; remove stub route after move. |

**Implementation notes:**

- Detail page: `src/app/(frontend)/[slug]/page.tsx` (not under `artworks/`).
- Static routes (`/bio`, `/cv`, `/contact`, `/statement`, `/datenschutz`, `/studio`, `/events`, …) win over `[slug]` in the App Router — add **reserved slug validation** on Artworks `slug` so no artwork uses those segments.
- Canonical URLs, sitemap entries, JSON-LD `@id`, and internal links (timeline, grid, slideshow) all use `https://bernardbolter.com/{slug}`.
- Redirects: `next.config.ts` `redirects` for `/artworks` and `/artworks/:slug` (see Phase 4.2).

---

## Agent handoff template (use for every step)

Copy this block into each auto-agent task:

```text
TASK: [Step ID — title]

READ FIRST (do not skip):
- docs/frontend-build-plan.md — **URL policy** (`/{slug}` detail, `/` = all artworks, `/artworks` → `/`)
- docs/designFiles/design-system.md — sections [list]
- .cursor/rules/bernardbolter.mdc
- Read-only: bernard-bolter-sass-old/bernardbolter.com/[paths]

WRITE ONLY IN: bernardbolter-com/src/...

CONSTRAINTS:
- Tailwind only (no new .scss)
- Breakpoints: s:/m:/l:/xl: only (550/768/979/1200) — never sm/md/lg
- Artwork images: useArtworkDimensions + object-contain only
- Series colors: getSeriesColor(slug) only
- Artwork URLs: link to `/{slug}` only; do not introduce `/artworks` as catalog (home `/` is the index)

DELIVERABLES:
- [file list]

ACCEPTANCE (all must pass):
- [checklist]

WHEN DONE:
- Run: npm run typecheck
- Run: npm run test:int (if tests added/touched)
- Brief note: what you ported, what you deferred, screenshots if UI step
```

---

## Phase 0 — Prerequisites (human, once)

**Owner:** You (not an agent).

| # | Action | Why |
|---|---|---|
| 0.1 | Confirm `.env` has DB + `NEXT_PUBLIC_IMAGE_DOMAIN` + published artworks with `primaryImage` | Frontend needs real data |
| 0.2 | Keep `bernard-bolter-sass-old` on disk; never commit secrets from old `.env` | Reference only |
| 0.3 | Open `docs/designFiles/design-system-visual.html` + old site side-by-side | Visual sign-off baseline |
| 0.4 | URL policy locked — see **URL policy** above (`/{slug}` detail, `/` = catalog, `/artworks` → `/`) | No agent decision needed |

**Gate:** At least 10 published artworks with images load via `getArtworks()` in dev.

---

## Phase 1 — Design foundation (Tailwind + tokens)

**Goal:** One config and global CSS so every later step uses the same tokens, breakpoints, and z-index layers.

### Step 1.1 — Align Tailwind config with design system

**Read:** `design-system.md` §2–5, §9; `bernardbolter.mdc`.

**Modify:**

- `tailwind.config.js` — add `screens: { s, m, l, xl }`, full `colors` from design doc, `zIndex` layers (`artwork`, `chrome`, `nav`, `overlay`, `ui-top`, `modal`), `spacing` scale (`space-1` … `space-12`), `maxWidth.grid`.
- `src/app/(frontend)/global.css` — `:root` CSS variables from design doc §10 (title box + status + `--text-secondary`, etc.), `scrollbar-hide` utility (keep), base body styles.

**Acceptance:**

- [ ] No default `sm:` / `md:` / `lg:` used anywhere new
- [ ] `npm run typecheck` passes
- [ ] Spot-check: `bg-surface-page`, `text-dark`, `z-chrome` classes resolve (temporary test page or Story-less grep)

**Depends on:** Phase 0.

---

### Step 1.2 — Port shared helpers & types (no UI)

**Read:** Old `src/helpers/*`, `src/types/*`; new `src/helpers/*` (many already exist).

**Tasks:**

- Diff old vs new: `seriesColor.ts`, `seriesInitals.ts`, `blurURLs.ts`, `timeline.tsx`, `getGridItemContainerSize.ts`, `sizeConversion.tsx`, `categories.tsx`, `convertUnits.ts`.
- Port missing pieces; align `sizeTier` field name with Payload (`sizeTier` not legacy `size` if schema changed).
- Add `src/types/frontend.ts` (or revive old type files) for filter/sort/provider shapes — typed from Payload `Artwork`, not WordPress.

**Acceptance:**

- [ ] `getSeriesColor('megacities')` returns `#FC7753`
- [ ] `generateTimeline()` works with Payload date fields (`timelineDate` / `yearCreated`)
- [ ] Unit tests for timeline + grid size helpers (optional but recommended)

**Depends on:** 1.1.

---

### Step 1.3 — Dependencies for parity

**Add packages** (match old site where still needed):

- `react-masonry-css` — grid layout
- `react-player` — artwork video
- `react-draggable` — if still used on detail (verify in `ArtworkContent.tsx`)

**Acceptance:**

- [ ] `npm install` clean; `npm run build` succeeds (or document known unrelated failures)

**Depends on:** 0.

---

## Phase 2 — Global shell (layout, provider, home frame)

**Goal:** Home page feels like the old site: left Info panel, right Nav, centre artworks area.

### Step 2.1 — Restore full `ArtworkProvider`

**Read:** Old `src/providers/ArtworkProvider.tsx`; new stub in `src/providers/ArtworkProvider.tsx`.

**Implement state** (minimum):

- `original`, `filtered`, `artist`
- `artworkViewTimeline` (boolean)
- `showSlideshow`, `slideshowIndex`, timer fields
- `filters` / `search` / `sorting` (wire to old `filterValues.js` / `sortValues.js` logic, Payload field names)
- `artworkContainerWidth`, `artworkContainerHeight`, `artworkDesktopSideWidth`
- `isProgramScroll` ref behaviour for timeline
- `infoOpen` can live in Info component or provider — match old

**Data:** Map Payload artwork → shape expected by `useArtworkDimensions` (`widthPx`/`heightPx` or read from media; `sizeTier`; series slug).

**Acceptance:**

- [ ] Home renders without runtime errors when provider consumed
- [ ] Filter/sort reduces `filtered` list
- [ ] Viewport resize updates container dimensions (desktop square = height − 125px, mobile = width − 50px)

**Depends on:** 1.2.

---

### Step 2.2 — Port SVG icons

**Read:** Old `src/svgs/*`.

**Write:** `src/components/icons/` (or `src/svgs/`) — TSX ports of all SVGs used by Nav, Info, title corners, playback, close buttons.

**Acceptance:**

- [ ] No missing imports when building Nav/Info/ArtworkTitle
- [ ] Fill classes use Tailwind tokens (`fill-ui-icon`, etc.) not hardcoded `#666` in JSX

**Depends on:** 1.1.

---

### Step 2.3 — `Info` + `HeaderTitle` + hamburger

**Read:** Old `components/Info/Info.tsx`, `HeaderTitle.tsx`; `info.scss`, `header-title.scss`, `menu.scss`.

**Write:**

- `src/components/info/Info.tsx`
- `src/components/info/HeaderTitle.tsx` (for Bio/CV/Statement overlays)
- `src/components/info/AnimatedHamburgerMenu.tsx`

**Acceptance:**

- [ ] Panel slides `translateX` open/close (~500ms)
- [ ] Artist name + links match design system typography
- [ ] z-index: `z-chrome` layer per `bernardbolter.mdc`

**Depends on:** 2.1, 2.2, 1.1.

---

### Step 2.4 — `Nav` + `FilterNav` + `SearchNav` + `SortItem`

**Read:** Old `components/Navs/*`; `nav.scss`, `menu.scss`.

**Write:** `src/components/navs/*` with Tailwind; preserve drawer slide-in from right, filter categories, search UI.

**Acceptance:**

- [ ] Buttons 33×34px hit area; opacity hover
- [ ] Timeline desktop: nav `top` ~130px; grid/slideshow: ~4px
- [ ] Filter hidden during slideshow; search hidden during slideshow
- [ ] No `<form>` tags — div + onClick (per design system)

**Depends on:** 2.1, 2.2.

---

### Step 2.5 — Home page composition

**Read:** Old `app/page.tsx`, `components/Artworks/Artworks.tsx`.

**Modify:**

- `src/app/(frontend)/page.tsx` — render `<Info />`, `<Nav />`, `<Artworks />` inside `main` (not Timeline-only)
- `src/components/artworks/Artworks.tsx` — orchestrator: switcher, timeline vs grid, slideshow overlay, title box, loading/no-artworks

**Acceptance:**

- [ ] Side-by-side with old site at 375px, 768px, 1200px widths — same structure (not pixel-perfect yet)
- [ ] Below 550px: timeline only, switcher hidden
- [ ] `AnimationWrapper` still wraps children

**Depends on:** 2.3, 2.4, Phase 3 (can stub grid/timeline with placeholders first).

---

## Phase 3 — Artworks views (core experience)

**Goal:** Timeline, grid, slideshow, and 3D title box match old behaviour.

### Step 3.1 — `useArtworkDimensions` + artwork image primitive

**Read:** `design-system.md` §6; old `hooks/useArtworkDimensions.tsx`, `ArtworkImage.tsx`, `ArtworkGridImage.tsx`.

**Write:**

- `src/components/artworks/ArtworkImage.tsx` — shared wrapper: series bg, explicit w/h, `object-contain`, optional play overlay
- Ensure hook uses `sizeTier` from Payload

**Acceptance:**

- [ ] XL work visibly larger than SM in same container
- [ ] Landscape vs portrait aspect respected
- [ ] No `object-cover` anywhere

**Depends on:** 2.1, 1.2.

---

### Step 3.2 — Timeline view

**Read:** Old `ArtworksTimeline.tsx`, `artworks-timeline.scss`.

**Write:** `src/components/artworks/ArtworksTimeline.tsx` — replace/supercede minimal `Timeline.tsx`.

**Acceptance:**

- [ ] Mobile: vertical scroll + vertical timeline line
- [ ] Desktop: horizontal scroll + horizontal line + arrow controls
- [ ] `isProgramScroll` guard on scroll handlers
- [ ] Thumbnails link to `/{slug}` (not `/artworks/...`)

**Depends on:** 3.1, 2.5.

---

### Step 3.3 — Grid view + switcher

**Read:** Old `ArtworksGrid.tsx`, `ArtworkSwitcher.tsx`, `artwork-grid.scss`, `switcher.scss`.

**Write:**

- `ArtworksGrid.tsx` + `react-masonry-css`
- `ArtworkSwitcher.tsx` — timeline/grid pill; hidden &lt;550px and during slideshow

**Acceptance:**

- [ ] Column counts: 1 / 2 / 3 / 4 / 5 at default / s / m / l / xl
- [ ] Gaps 5/7/9/11/13 px (integer px allowed)
- [ ] max-width 1500px centred

**Depends on:** 3.1, 2.5.

---

### Step 3.4 — Artwork title box (3D corners)

**Read:** Old `ArtworkTitle.tsx`, `TitleCorner*.tsx`, `artwork-title.scss`; design-system §7 title box.

**Write:** Port corner SVGs verbatim; Tailwind for faces; CSS variables `--surface-title`, `--surface-side-light`, `--surface-side-dark`.

**Acceptance:**

- [ ] Desktop vs mobile vs slideshow modes correct at 768px boundary
- [ ] No `border-radius` on title box
- [ ] Series dot uses `getSeriesColor`

**Depends on:** 2.2, 2.5, 3.1.

---

### Step 3.5 — Slideshow + video

**Read:** Old `ArtworksSlideshow.tsx`, `ArtworkVideo.tsx`, `artwork-video.scss`.

**Write:** Slideshow with timer ring, play/pause, integrates `react-player` where needed.

**Acceptance:**

- [ ] Autoplay progress ring works
- [ ] Title box slideshow mode (inverted colours)
- [ ] Nav timer/pause buttons visible in slideshow only

**Depends on:** 3.4, 2.4, 1.3.

---

### Step 3.6 — Loading & empty states

**Read:** Old `Loading.tsx`, `NoArtworks.tsx`, `loading.scss`.

**Write:** Tailwind port; keep floating orb animation (inline styles OK per design doc).

**Depends on:** 2.5.

---

## Phase 4 — Artwork detail page

**Goal:** `/{slug}` matches old site; legacy `/artworks/*` paths redirect correctly.

### Step 4.1 — Move detail route to `/{slug}` + port UI

**Read:** Old `app/[slug]/page.tsx`, `ArtworkContent.tsx`, `ArtworkDetail.tsx`, `ArtworkSize.tsx`; current stub `src/app/(frontend)/artworks/[slug]/page.tsx`.

**Modify:**

- **Create** `src/app/(frontend)/[slug]/page.tsx` — fetch published artwork by slug, render full UI (not stub)
- **Remove** `src/app/(frontend)/artworks/[slug]/page.tsx` after move (or leave only redirect — prefer config redirects in 4.2)
- Update `resolveArtworkSeo` / metadata / JSON-LD canonicals to `/{slug}` (not `/artworks/{slug}`)
- Components: content layout, detail rows, size conversion, video, image with `useImageFactors: true`
- **Reserved slugs:** validate on Artworks collection (hook or field validate) — block slugs that collide with static routes: `bio`, `cv`, `contact`, `statement`, `datenschutz`, `studio`, `admin`, `api`, `events`, `artworks`, etc.

**Acceptance:**

- [ ] `https://bernardbolter.com/{slug}` serves detail page
- [ ] Metadata + JSON-LD canonical `@id` use `/{slug}`
- [ ] Detail panel alternating rows (`surface-panel-*`)
- [ ] Close control returns to `/` with sensible view default
- [ ] Unknown slug → `notFound()` (not a static page leak)

**Depends on:** 3.1, 2.3 (close button pattern).

---

### Step 4.2 — Redirects (`/artworks` → home, legacy detail paths)

**Add** to `next.config.ts`:

```ts
{ source: '/artworks', destination: '/', permanent: true },
{ source: '/artworks/:slug', destination: '/:slug', permanent: true },
```

**Acceptance:**

- [ ] `/artworks` → `/` (home catalog)
- [ ] `/artworks/deutsche-stadt` → `/deutsche-stadt`
- [ ] Old bookmark `/{slug}` works without redirect (primary URL)

**Depends on:** 4.1.

---

## Phase 5 — Secondary pages

**Goal:** Bio, Statement, Contact, CV, Datenschutz, 404 match old layouts.

| Step | Old route | New route | Old component |
|---|---|---|---|
| 5.1 | `/bio` | `/bio` | `Bio.tsx` |
| 5.2 | `/statement` | `/statement` | `Statement.tsx` |
| 5.3 | `/contact` | `/contact` | `Contact.tsx` |
| 5.4 | `/cv` | `/cv` | `CV.tsx` — enhance existing |
| 5.5 | `/datenschutz` | `/datenschutz` | `datenschutz.scss` content |
| 5.6 | — | `not-found.tsx` | `not-found.scss` |

**Each step:**

- Read old page + scss
- Payload source: Artist global / site documents / events collection (CV already uses `getCvEvents`)
- Include `HeaderTitle` overlay + fixed close button positions per breakpoint table (design-system §5)
- Lexical/rich text: use Payload rich text renderer or plain from `description` fields

**Acceptance (per page):**

- [ ] Responsive padding formula (`5%` mobile → calc centred column desktop)
- [ ] Close button top offsets match table for that page
- [ ] SEO metadata on each route

**Depends on:** 2.2, 2.3, 1.1.

---

## Phase 6 — SEO, analytics, polish

### Step 6.1 — Sitemap & metadata

**Read:** Old `sitemap.ts`; new `src/app/(frontend)/`.

**Write:** `sitemap.ts` — artwork URLs as `/{slug}` (match old site); static routes `/bio`, `/cv`, etc.; verify `layout.tsx` metadata.

**Depends on:** 4.1, Phase 5.

---

### Step 6.2 — Klaro + GA (verify)

**Read:** `components/common/Klaro.tsx`, `GoogleAnalytics.tsx` — likely done.

**Acceptance:**

- [ ] GA only loads after consent
- [ ] No duplicate scripts

---

### Step 6.3 — Visual QA pass (human checklist)

| Check | Viewport |
|---|---|
| Info panel open/close | all |
| Timeline horizontal scroll | ≥768px |
| Timeline vertical | &lt;768px |
| Grid 5 columns | ≥1200px |
| Title box 3D corners | desktop + mobile |
| Slideshow timer | desktop |
| Artwork detail | phone + desktop |
| CV/Bio close button position | per page |

---

## Phase 7 — Tests & cleanup

- Port/adapt old Jest tests: `ArtworksSlideshow.test`, `ArtworkTimeline.test`, `ArtworkProvider.test` → Vitest
- Remove dead `Timeline.tsx` if fully replaced by `ArtworksTimeline`
- Remove commented-out giant block in `ArtworkProvider.tsx`
- Delete any accidental `.scss` imports

**Acceptance:**

- [ ] `npm run test:int` green
- [ ] `npm run build` green

---

## Suggested agent execution order (parallelism)

```text
Phase 0 (you)
  → 1.1 → 1.2 → 1.3
  → 2.1 + 2.2 (parallel)
  → 2.3 + 2.4 (parallel)
  → 2.5
  → 3.1 → 3.2 + 3.3 (parallel) → 3.4 → 3.5 → 3.6
  → 4.1 → 4.2
  → 5.1–5.6 (parallel per page)
  → 6.x → 7
```

**Do not parallelize** 3.4 (title box) with 3.2/3.3 until `Artworks.tsx` orchestrator structure is stable.

---

## Risk register (watch during oversight)

| Risk | Mitigation |
|---|---|
| Payload field names ≠ WordPress (`sizeTier`, dates, series relation) | Step 1.2 mapping layer in provider |
| `ArtworkProvider` stub masks missing state until late | Step 2.1 before UI polish |
| Title box CSS variables missing → corners break | Step 1.1 global.css §10 |
| Artwork slug collides with `/bio`, `/cv`, etc. | Reserved slug validation (Step 4.1); static routes always win |
| Dev links to `/artworks/...` | Step 4.2 permanent redirects to `/{slug}` |
| Grid gap non-integer → layout drift | Keep px gaps from design doc |
| Agent uses `sm:` breakpoint | Enforce `bernardbolter.mdc` in every task |

---

## Definition of done (project)

- [ ] Home: Info + Nav + timeline/grid/slideshow + title box ≈ old site
- [ ] Artwork detail page complete at `/{slug}`; `/artworks` redirects to `/`
- [ ] Bio, Statement, Contact, CV, Datenschutz, 404 complete
- [ ] No Sass on frontend; Tailwind + design tokens only
- [ ] `design-system.md` followed (artwork sizing, breakpoints, z-index)
- [ ] `npm run build` succeeds
- [ ] You sign off visual QA at 375 / 768 / 1200 px

---

*Plan version: 2026-06-01. Repo: bernardbolter-com. Legacy reference: bernard-bolter-sass-old/bernardbolter.com. URL policy: `/{slug}` detail, `/` catalog, `/artworks` → `/`.*

# Sessions Pages — JSON-LD Embedding & Categorization
*July 24, 2026 · Read alongside `sessions-tier5-machine-access-spec.md`, `corpus-api-restructure-spec.md`.*

---

## Part 0 — Verify current state first (do not assume)

Claude's web-fetch tool converts HTML to readable text and strips `<script>` tags in that process — meaning the crumb-only appearance observed at `/sessions` and `/sessions/[slug]` could reflect either (a) no JSON-LD present, or (b) JSON-LD present but invisible to that tool. **Cursor: check the raw page source (`view-source:` or `curl`) before treating this as new work.** If the JSON-LD described below already exists, this spec becomes a verification/gap-fix pass instead of a build.

---

## Part 1 — Why this is different from a Tier 5 link-out

The prior suggestion (link from the crumb page to the Tier 5 API endpoint) is a valid pattern but not what was intended. The actual design: the session page itself should carry the full session data — the same content Tier 5 serves — embedded as JSON-LD in a `<script type="application/ld+json">` tag. A crawler or AI reading the page's raw HTML gets the complete record directly, without a second request to `/api/corpus/[slug]?tier=5`. A human viewing the rendered page still sees only the crumb (type, date, linked works) — the JSON-LD block is invisible to normal page rendering by design, same as any other JSON-LD on the site.

This does **not** mean building a visible transcript UI. That remains a separate, undecided question. This spec is purely: same content already proven live at Tier 5, embedded directly in the page instead of (or alongside) being fetched separately.

---

## Part 2 — JSON-LD shape

Embed on `/sessions/[slug]`, using the same two-stream structure already validated at Tier 5:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "artism:Session",
  "@id": "https://bernardbolter.com/sessions/venice-biennale-2007-linchpin-2026-07-23",
  "sessionType": "artwork-cataloguing",
  "completedAt": "2026-07-23T22:13:50.119Z",
  "primaryArtwork": "https://bernardbolter.com/venice-biennale-2007",
  "mentionedArtworks": ["https://bernardbolter.com/skulptur-projekte-m-nster-2007"],
  "artistRecord": { "...": "same shape as Tier 5" },
  "artism:DialogueSelfAudit": { "...": "same shape as Tier 5" },
  "sameAs": "https://bernardbolter.com/api/corpus/venice-biennale-2007?tier=5"
}
</script>
```

- `sameAs` points back to the canonical Tier 5 API response — do not treat the embedded copy as a second source of truth; if the two ever diverge, the API response wins (same precedence rule already used elsewhere for `sameAs`/`sameAsUrls`).
- Reuse the exact field shapes from `sessions-tier5-machine-access-spec.md` Part 2 — do not redefine them here.
- `primaryArtwork`/`mentionedArtworks` become full URLs in this context (JSON-LD convention), vs. plain slugs in the Tier 5 API response — this is an intentional difference between the two representations, not an inconsistency to fix.

**Do NOT** render any part of `artistRecord` or `artism:DialogueSelfAudit` in the visible page markup. The crumb (type, date, linked works) is the entire human-visible surface. JSON-LD only.

---

## Part 3 — Categorization for the `/sessions` index

The index page is currently a flat reverse-chronological list. `/corpus` already has a working facet pattern (series, year range, reasoning status, vision status) — extend the same mechanism here rather than inventing a new one.

Add filters:
- **`sessionType`** — `artwork-cataloguing` | `artist-statement` | `biography` | `onboarding` | `event-enrichment` | `corpus-revisit` (per `corpus-relation-fields-and-linchpin-sessions-spec.md`)
- **`series`** — derived from `primaryArtwork`'s series, same controlled vocabulary as `/corpus`
- **Date range** — `completedAfter` / `completedBefore`, same pattern as `/corpus`'s year range
- **`linchpinFlag`** — boolean toggle, surfaces linchpin sessions specifically (this is genuinely useful now that the concept exists — lets you or anyone else find every session that did corpus-wide double duty)

Filters should be real, linkable query params (`/sessions?sessionType=artwork-cataloguing&series=breaking-down-art`), not client-only JS state — consistent with `/corpus`'s crawlable filter design, since this index should be as machine-navigable as the artwork one.

---

## Part 3.5 — A plain visible link is required too, separate from JSON-LD

JSON-LD in a `<script>` tag solves machine-readability for crawlers and AI systems that parse raw HTTP responses directly. It does **not** solve it for AI agents (like Claude, operating through a standard fetch-and-render tool) that convert pages to readable text and strip script content in that process — a real, encountered limitation, not a hypothetical one. Those tools also typically only follow URLs that appear as an actual rendered link on a page they've already fetched, not ones they can guess by pattern even when they know the URL structure.

**Add a plain, visible anchor link** — not inside the JSON-LD block — on each session crumb page:

```html
<a href="https://bernardbolter.com/api/corpus/venice-biennale-2007?tier=5">Full session data (JSON)</a>
```

Placement: on `/sessions/[slug]`, near the existing crumb content. Consider also adding it to each artwork's per-item entry on `/corpus` and `/sessions` (alongside the existing `Vision`/`Record`/`Sessions` links), so an agent working from either page can reach Tier 5 directly without needing the exact slug spelled out elsewhere.

This is a small addition but it's the difference between "machine-readable in principle" and "actually reachable by an AI agent using ordinary tools" — worth treating as load-bearing, not cosmetic.

## Part 4 — Do NOT

- Do not render `messages`, `firstImpression`, `secondDescription`, or any `artism:DialogueSelfAudit` field in visible HTML — JSON-LD only, this spec does not change that boundary.
- Do not duplicate field-shape decisions already made in `sessions-tier5-machine-access-spec.md` — this spec only adds a second delivery mechanism (embedded vs. API), not a second schema.
- Do not build the categorization filters as client-side-only — they must be real query params, crawlable and linkable.
- Do not skip Part 0's verification step — confirm nothing here is already built before treating it as new work.

---

## Part 5 — Build order

**Step 1** — Verify current JSON-LD state via raw source inspection (Part 0).
**Step 2** — If missing, add the `artism:Session` JSON-LD block to `/sessions/[slug]`, sourced from the same data Tier 5 already serves.
**Step 3** — Add `sessionType`, `series`, date-range, and `linchpinFlag` filters to `/sessions`, mirroring `/corpus`'s query-param pattern.
**Step 4** — Update the stale copy on both `/sessions` and `/sessions/[slug]` — "Public crumbs only... transcripts stay private" is no longer accurate now that Tier 5 (and, per this spec, the embedded JSON-LD) make session data public and machine-readable. Replace with accurate language, e.g. "Full session data is machine-readable via JSON-LD and the corpus API; this page shows a human-readable summary only."

---

## Verification checklist

- [x] Raw page source for `venice-biennale-2007-linchpin-2026-07-23` confirmed to either already have, or now have, a `<script type="application/ld+json">` block with the full session data *(Part 0: was missing; now embedded via `buildSessionJsonLd`)*
- [x] Rendered/visible page content unchanged — crumb only *(plus visible Tier 5 link per Part 3.5)*
- [x] `sameAs` correctly points to the live Tier 5 API URL
- [x] `/sessions?sessionType=...&series=...` filters return correctly scoped results via URL alone (no JS required to reach a filtered state)
- [x] `linchpinFlag=true` filter correctly surfaces the Venice Biennale 2007 session
- [x] Stale "transcripts stay private" copy corrected on both pages
- [x] A plain, visible `<a href>` link to the Tier 5 API endpoint (not just JSON-LD) exists on the session crumb page — also on `/sessions` rows and `/corpus` index entries

---
*Sessions JSON-LD & categorization spec · July 24, 2026*

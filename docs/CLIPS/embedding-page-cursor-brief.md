# Embedding Page — `/[slug]/embedding`

*Human-readable CLIP embedding detail page. Converts the previously-specced bare JSON route into a real page. One canonical URL, serving both a human visitor and machine-readable JSON-LD.*

Read alongside: `clip-embeddings-spec.md` (Part 3 — this brief supersedes that section's content/copy with finalized text and layout), `design-system.md`, `artwork-page-layer-reorganization-addendum.md`

---

## Route

```
src/app/(public)/[slug]/
  embedding/
    page.tsx
```

Replaces any prior `route.ts` JSON-only implementation at this path, if one exists. One URL now serves both audiences — see "Machine-facing JSON-LD" below.

---

## 1. Navigation — reuse the existing nav, override one link

This page uses the same persistent left-nav component every other page on the site uses (wordmark, back-link, hamburger/info stack) — **do not build a custom nav for this page.**

**The one required change:** on every other page, the link directly under the artist name reads `← All Artwork` and goes to the archive root. **On this page specifically, that same link slot instead reads `← Back to [artwork title]`** and links to `/[slug]` (the artwork this embedding belongs to) — same position, same styling, same role in the layout, just a different destination and label because this page sits conceptually inside a single artwork rather than being a top-level destination.

The actual "go to all artworks" path is unaffected — it's already reachable via the hamburger/info panel on every page, exactly as today. Nothing new needed there.

Implementation: whatever prop or context currently drives the nav's back-link label/href, pass `Back to ${artwork.title}` / `/${artwork.slug}` on this route instead of the default `All Artwork` / archive-root values. Check how the nav component currently receives this (likely a layout-level prop or a per-route override) before assuming a specific mechanism.

---

## 2. Page content — top to bottom

### Artwork image + title block
- The artwork's primary image, full width within the content column
- Title, year, medium directly below — same typographic treatment as the main artwork page's title block (Staatliches/Barlow Condensed per `design-system.md`'s type scale, not a new style)

### Similar works — three thumbnails, with similarity score labeled
This section already exists and renders correctly at its current (small) thumbnail size on the artwork page — confirmed working, confirmed the right size, **do not enlarge these thumbnails or change their layout to two columns**. At their current size the 300px thumbnail source holds up fine; only stretching them larger causes blur, so the fix is simply: don't stretch them. Full-resolution viewing is one click away via each thumbnail's link to its own artwork page.

**Required addition not yet present:** each thumbnail needs its similarity score visible, labeled clearly enough that a reader understands what the number means without prior context. Use the wording **"similarity"**, not "match" — these are a continuous closeness score, not a binary pass/fail, and "similarity" is the more accurate term.

Example treatment (adjust spacing/typography to match the design system, not as literal CSS):
```
[thumbnail image]
Venice Biennale          87% similarity
```
Small, muted text (consistent with the existing "via visual similarity" section label already in `ClipEmbeddingNote.tsx`) — this is supporting detail, not a headline number.

**Where does the similarity score come from?** It's already computed in the existing `findSimilarArtworks()` query (`similarity.ts`) as `1 - (clip_embedding <=> $1::vector) AS similarity` — a 0–1 float. This page needs that same value, multiplied by 100 and rounded for display (e.g. `Math.round(similarity * 100)`). Confirm whether `getSimilarArtworksForPage` already returns this value alongside each `SimilarArtworkCard` — if not, it needs to be added to that return shape so both this page and `ClipEmbeddingNote` (which currently doesn't display the score at all) can use it. **`ClipEmbeddingNote.tsx` does not need to change to show the score** — that component intentionally stays score-free per its existing design; only this embedding page surfaces the percentage.

### Long-form text — finalized copy, do not paraphrase or rewrite

```
A small, useful thing

This number — a list of 768 values, computed once from this image — comes from something called a CLIP embedding. It's a way of describing what's actually in a picture using mathematics instead of words: shapes, colors, composition, the visual relationships between things.

Right now, it does something modest. It lets this archive quietly notice when one of my works visually echoes another — across thirty years and ten different bodies of work — without me having to manually tag every connection myself. The three pieces linked above this page weren't chosen by me. They were found by the numbers.

But the more interesting case isn't really about my own archive at all.

Artists, working alone, in different cities, different decades, sometimes arrive at strikingly similar visual ideas without ever knowing the other existed. No shared gallery, no studio crossover, no citation trail. That kind of connection is almost impossible to find through normal art-historical research, because it requires someone to have already known to look for it. A CLIP embedding doesn't need to know either artist's name, reputation, or market value to notice the resemblance — it just looks at what's there.

If more artists made their work readable this way — openly, in public, the way this archive does — those kinds of connections wouldn't need to wait for the right curator or critic to stumble onto them by chance.

They'd simply be findable.
```

Render this in a visually distinct zone from the rest of the page — a muted panel background (`#efeee9`, the same tone already established for Object record panels in `design-system.md`) sets it apart as a more reflective, behind-the-scenes register than the page's surrounding white. First line ("A small, useful thing") as a heading, remaining paragraphs as body prose. Generous line-height (1.7–1.8) — this is read prose, not UI copy.

### Metadata card
Small factual card, white background, bordered, with the artwork's series color as a left accent border — same visual idiom as the existing Status & Provenance card pattern (`border: 0.5px solid rgba(0,0,0,0.09); border-left: 3px solid [series colour]`). Contents:
- Model: `CLIP ViT-L/14`
- Dimensions: `768`
- Generated: the date this artwork's embedding was created (if not currently stored, note this as a gap — see "Open question" below)

### Raw vector — visual presence only, not meant to be read
A small, muted, monospace block showing the start of the actual 768-value array, cut off with a fade-to-background gradient rather than showing the full array — communicates "this is real, dense, machine data" without inviting anyone to scroll through 768 numbers. Label above it: "The vector itself · not meant to be read" (or similar — exact wording flexible, intent is not). Full-precision complete array does **not** need to live here in visible HTML — it lives in the JSON-LD block instead (see below), keeping the visible page itself light.

---

## 3. Machine-facing JSON-LD

In this page's `<head>`, emit:

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  },
  "@type": "artism:VisualEmbedding",
  "isPartOf": {
    "@type": "VisualArtwork",
    "name": "[artwork.title]",
    "url": "https://bernardbolter.com/[slug]"
  },
  "artism:model": "CLIP-ViT-L-14",
  "artism:dimensions": 768,
  "artism:generatedDate": "[date generated, if available]",
  "artism:vector": [/* full 768-value array */]
}
```

This is where the complete, full-precision vector actually lives — present and machine-readable, just not rendered as visible page content.

---

## 4. Edge cases

- **`clip_embedding IS NULL` for this artwork** (stub record): render a short, quiet message — "Visual similarity data has not yet been generated for this work." — not an error, not a blank page. No similar-works section, no vector block, no metadata card.
- **Unpublished or nonexistent slug**: 404, same as the main artwork page's existing behavior.

---

## Open question — flag, don't guess

The metadata card and JSON-LD both want a "generated date" for the embedding. **Check whether the backfill script or the schema captured this anywhere** (e.g. a `clip_embedding_generated_at` column, or whether `updated_at` on the artwork row coincidentally reflects it accurately). If no real generated-date value exists anywhere, do not fabricate one — omit that field from both the visible card and the JSON-LD rather than showing a wrong or guessed date.

---

## Do NOT

- Do not build a custom/new nav for this page — reuse the existing component, override only the back-link label and href
- Do not enlarge the similar-works thumbnails or move them to a two-column layout — current small size is confirmed correct and avoids the blur issue entirely
- Do not use "match" in the similarity label — use "similarity"
- Do not rewrite or paraphrase the long-form text — it's finalized copy
- Do not show the full 768-value vector as visible, scrollable page content — truncated preview only; full array goes in JSON-LD
- Do not fabricate a "generated date" if one isn't actually available in the data

---

## Verification checklist

- [ ] Nav back-link reads "Back to [artwork title]" and links to `/[slug]`, only on this route — every other page's nav is unaffected
- [ ] "All artworks" path still reachable via the hamburger/info panel, unchanged
- [ ] Three similar-works thumbnails render at their existing (small) size, each showing a similarity percentage labeled "similarity," not "match"
- [ ] Long-form text matches the finalized copy exactly, rendered on the muted panel background
- [ ] Metadata card shows model/dimensions/generated-date (or omits generated-date if genuinely unavailable, per Open Question above) with correct series-color left border
- [ ] Raw vector block shows a truncated, faded preview — not the full array, not selectable/scrollable as a giant block
- [ ] JSON-LD in `<head>` contains the complete 768-value array and resolves correctly
- [ ] Stub records (null embedding) show the quiet fallback message, no broken sections
- [ ] Unpublished/nonexistent slugs return 404

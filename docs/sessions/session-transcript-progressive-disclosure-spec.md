# Session Transcript Progressive Disclosure — Spec

*August 2026. Read alongside `corpus-traversal-patch-spec.md` (Fix 2, which this spec extends) and `sessions-tier5-machine-access-spec.md` (Tier 5 JSON, which this does NOT replace).*

---

## Part 0 — Why

`/sessions/[slug]` currently shows a human-readable crumb — session type, date, primary/mentioned artworks — and links out to the JSON Tier 5 endpoint for the full transcript. That was a deliberate choice, made for a reason worth stating plainly: raw dialogue includes typos, false starts, and mid-thought corrections, and the instinct was that curated Tier 4 prose is the more presentable version.

That reasoning has been revisited. The imperfect parts of a transcript — a misspelled word, a correction mid-sentence — aren't flaws to launder out; they're what makes the record read as something that actually happened, to a human, right now, rather than something written *about* what happened. Tier 4 prose is honest about outcomes. The transcript is honest about process. The archive should show both, not gate one behind a JSON endpoint that most human visitors will never open.

This also happens to close a real gap for HTML-only agents (documented in `corpus-traversal-patch-spec.md`'s cross-agent reachability notes) that cannot follow `application/json` links — but that's a secondary benefit, not the reason for the change.

**The standing SSR rule applies here at full strength:** the complete transcript must be present in the raw server-rendered HTML, testable with JavaScript disabled — not fetched or revealed on click. This is the same rule, and the same failure mode, as the original homepage "loading…" bug. Get this wrong and it's the same bug with a different label.

---

## Part 1 — What changes on `/sessions/[slug]`

Add a transcript section below the existing crumb (primary/mentioned artworks, breadcrumb nav, JSON links all stay exactly as they are — this is additive).

**Content:** the full `messages` array from that session's Tier 5 record, in order, rendered as a simple two-party dialogue (existing role labels — user/assistant — map to Artist/whatever label is already used elsewhere on the site for the cataloguing agent, for consistency).

**Progressive disclosure, not lazy loading:**
- The entire transcript renders into the DOM on the server, every message, in the initial HTML response.
- A default-visible slice (first N messages — recommend the same count that reads as "a natural excerpt," roughly 6–10 exchanges, tune against real sessions once built) is shown unclipped.
- The remainder is present in the DOM but visually collapsed (`max-height` + overflow, or a `hidden` attribute toggled by a few lines of vanilla JS / a `<details>` element if that fits the existing component patterns) — never removed from the response, never fetched after the fact.
- An "Expand full conversation" control toggles visibility only. No network request, no client-side data fetch, no placeholder swapped for real content after mount.

**Do NOT** implement this as: render a preview, then `fetch()` the rest on click. That reintroduces exactly the crawler-invisible-content problem this spec exists to avoid — a JS-off reader or a raw-HTML fetch would see only the preview and have no way to know more exists, the same failure as the pre-fix homepage.

---

## Part 2 — Empty turn handling

Some sessions contain `messages` entries with empty `content` strings — an artifact of the image-upload step in the Art/Official flow, not something the artist said or the agent generated.

**Rule:** skip empty-content messages in the rendered HTML output only. Do not alter, filter, or clean the underlying JSON — the Tier 5 API response stays byte-for-byte as-is; this is a render-layer skip, not a data change. A future editor should be able to diff the rendered transcript against the raw JSON and see that the only messages missing are the ones with empty content — nothing else is trimmed, reordered, or rewritten.

---

## Part 3 — Component placement and reuse

This is the same component family as the artwork page's existing prose sections (Contribution, Intent, Making, etc. — see `venice-in-the-middle` for the current pattern). Build the transcript block as a reusable component so it can also be surfaced (later, out of scope for this spec) as a linked block from the artwork page itself, not just from `/sessions/[slug]`.

**Do NOT** duplicate the transcript-rendering logic between the session page and any future artwork-page embed — one component, referenced from both places when that day comes.

---

## Do NOT (full list)

- Do NOT fetch transcript content client-side after initial mount, in any form — full data must be in the first server response.
- Do NOT remove or truncate the underlying JSON at the Tier 5 API (`/api/corpus/{slug}/sessions`, `/api/corpus/sessions/{slug}?tier=5`) — those stay complete and unchanged; this spec only adds an HTML rendering.
- Do NOT alter, correct, or clean up message text (typos, grammar, false starts) in the rendered output — the whole point is showing the real thing.
- Do NOT remove empty-content messages from the underlying data — skip them in rendering only.
- Do NOT remove the existing crumb copy ("Full transcripts are public via the machine endpoint below") — it's still accurate; the transcript being inline now is additive, not a replacement for the JSON links.
- Do NOT remove or de-link the existing `[Full session data (JSON)]` / `[This session (JSON)]` links — machine consumers should still have the structured version.
- Do NOT collapse or hide the *first* slice of the transcript — only content beyond the default-visible count should start collapsed.

---

## Verification checklist

- [ ] `curl -s https://bernardbolter.com/sessions/{slug} | grep` for a phrase known to appear late in a long transcript — confirms full content is server-rendered, not just the visible preview
- [ ] View raw HTML with JavaScript disabled — full transcript text is present in the DOM (may be visually hidden via CSS, but present as real text, not `display:none` on an empty placeholder)
- [ ] Expand/collapse toggle works with JS enabled; no network tab activity on click (no fetch, no XHR)
- [ ] Empty-content messages do not appear in rendered output
- [ ] Underlying Tier 5 JSON endpoints unchanged — empty-content messages still present there
- [ ] Existing crumb copy and JSON links still present and unchanged
- [ ] Spot-check a session with typos/corrections in the artist's raw messages (e.g. `venice-in-the-middle`'s "not a commisision, just a submission" turn) — confirm it renders as-typed, uncorrected

---

*Session transcript progressive disclosure · August 2026*
*Read alongside: corpus-traversal-patch-spec.md, sessions-tier5-machine-access-spec.md*

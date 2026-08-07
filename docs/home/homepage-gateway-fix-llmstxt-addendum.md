# Homepage Gateway Fix — Addendum: llms.txt Link
*August 2026. Read alongside `homepage-gateway-fix-spec.md`. Adds to Part 2 before deploy — not yet shipped, fold in now rather than as a follow-up.*

---

## Why

`llms.txt` (drafted separately, ready for `/public/llms.txt` or an equivalent dynamic route — see open question below) documents the tier system for cold-starting agents, but a document that exists at a URL nobody points to is only found by convention-checking or luck. It needs a real, visible link from the one page every agent's traversal starts from — the same page this whole spec is about fixing.

Discovery is a separate problem from correctness, and only correctness is solved by writing the file. This addendum solves discovery, minimally.

---

## Change to Part 2

Add one small, real, server-rendered link to the homepage — same treatment and same general placement as the existing `[Machine-readable archive index]` link to `/api/corpus/index`. Suggested label: `[llms.txt]` or `[Machine-readable guide]`. Footer or nav, wherever the existing corpus-index link already lives — keep them together, they serve the same audience.

This link must be present in the server-rendered HTML from the start — it's identity/navigation content per the standing rule in the base spec, not something to defer to client-side rendering.

**Do NOT** make this link the only place `llms.txt` is referenced. Also add a comment line pointing to it in `robots.txt`:

```
# llms.txt: https://bernardbolter.com/llms.txt
```

This isn't an enforced directive — there's no formal `robots.txt` support for `llms.txt` — but some crawlers that know the convention check there for it, and it costs nothing to add.

---

## Open question, not this spec's to resolve alone

Static file in `/public/llms.txt` vs. a dynamic route (matching how `sitemap.xml` is already implemented as a dynamic route rather than a static file). Given the tier system has changed twice in one day already, a dynamic route that stays accurate automatically is worth the small extra cost over a static file that needs manual updates every time the tier structure moves. Flag this to Cursor as a decision to make when `llms.txt` itself is implemented — this addendum only requires that a link to whichever version exists is present on the homepage.

---

## Verification checklist (adds to base spec's checklist)

- [ ] Homepage HTML contains a real, visible, server-rendered link to `llms.txt`, alongside the existing corpus-index link
- [ ] `robots.txt` contains a comment pointer to `llms.txt`
- [ ] Link present in raw HTML with JavaScript disabled (same test as the rest of this spec)

---

*Homepage gateway fix — llms.txt addendum · August 2026*

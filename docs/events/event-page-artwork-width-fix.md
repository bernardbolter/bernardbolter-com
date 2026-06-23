# Event Page — Artwork Thumbnails & Content Width Fix
*June 2026 · Targeted fix only — do not touch anything else on this page*

---

## Fix 1 — Artworks Shown: switch to thumbnail grid

The current implementation uses the physical-size-scaling artwork card component from the browsing grid. That component is correct on the main grid where communicating relative physical scale across works is the point. On an event page, "Artworks Shown" is a reference list — the visitor just needs to see what was in the show and click through. Replace with a simple thumbnail grid.

**Change to:**
- 3-column grid (2-column on mobile)
- Each card: fixed width ~180–200px, fixed height ~240–260px
- Image: `object-fit: contain`, `background: transparent` or site base colour — do NOT crop
- Title below the image, small text, muted colour (`--color-text-tertiary` or equivalent)
- Entire card is a link to the artwork's slug page (`/[slug]` or `/artworks/[slug]` — use whatever the existing artwork routing is)
- No price, no size, no series label — just image + title

**Do NOT:**
- Use the size-scaling component from the browsing grid
- Use `object-fit: cover`
- Add any hover animations beyond a simple opacity shift on the link

---

## Fix 2 — Content width: increase to ~900–960px

The content column is currently capped too narrow (appears ~600px). This leaves unused space on desktop and makes the installation photo grid feel cramped.

**Change to:**
- Content max-width: `960px` (starting value — tune in browser if needed)
- This applies to the whole page content area: header, photos, text, artworks, context, references
- The MEGACITIES large title in the top-right corner sits outside this constraint — do not adjust it

---

## What NOT to touch

- ✗ Do not change section order
- ✗ Do not change the installation photo masonry grid
- ✗ Do not change the artistNote blockquote styling
- ✗ Do not change the context or references sections
- ✗ Do not change date formatting or the event type pill

---

## Verification

- [ ] Artworks render as a 3-column thumbnail grid, uniform size, `contain` not `cover`
- [ ] Each artwork card links to its artwork page
- [ ] Title renders below the image in small muted text
- [ ] Content column is visibly wider on desktop (~960px max-width)
- [ ] Installation photo grid benefits from the extra width
- [ ] Nothing else on the page changed

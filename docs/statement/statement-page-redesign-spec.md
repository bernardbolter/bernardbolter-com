# Statement Page Redesign Spec
## bernardbolter.com · `/statement` · June 2026

*Read alongside `design-system.md` (Statement page padding/close-button/header-overlay rules — already locked, not repeated here) and `bio-page-spec.md` (sibling page, same chrome, similar photo-array pattern — diverge only where this spec says so).*

---

## Part 0 — What's changing and why

The current Statement page (content finalized, confirmed strong) renders as a flat stack: uniform paragraphs, then four photos at identical width with identical small-grey captions underneath. The essay has a narrative arc — a quiet, confessional opening; a turn; a closing thesis stated twice. The layout doesn't move with it.

This spec adds four typographic/layout devices, all driven by new authored fields (not computed/parsed from prose) so editorial control stays with the artist:

1. A **drop cap** on the opening paragraph (pure CSS, no new field)
2. A **pull-quote break** — an existing Lexical blockquote node gets special treatment instead of default blockquote styling
3. A **photo sequence** with three layout variants (full-width / paired diptych / offset-small) instead of one uniform size, plus a documentation-vs-rendering dot marker on captions
4. A **closing statement block** — the thesis line broken out as a dark, full-bleed typographic moment, separate from the running prose

Nothing about the page's outer chrome changes — padding, close button position, header overlay ("STATEMENT" decorative background text) are already locked in `design-system.md` and stay exactly as-is.

---

## Part 1 — Schema additions

### 1.1 Statement photo gallery — new field on Artist singleton

No structured home currently exists for Statement page photos (they're presumably hardcoded or loosely attached). Add a repeatable array, parallel in shape to `bioPhotos` but with two additions: `imageType` (drives the caption dot) and `layoutVariant` (drives sizing/grouping).

```ts
{
  name: 'statementPhotos',
  type: 'array',
  admin: {
    description: 'Photo sequence on the Statement page. Order here controls display order — this is a narrative sequence, not a grid, so order matters more than on the Bio page.',
  },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'caption',
      type: 'text',
      localized: true,
    },
    {
      name: 'imageType',
      type: 'select',
      required: true,
      defaultValue: 'photograph',
      options: [
        { label: 'Photograph (documentation)', value: 'photograph' },
        { label: 'Drawing / sketch (artist\'s own rendering)', value: 'rendering' },
      ],
      admin: {
        description: 'Drives the caption dot: solid = documentary photograph, hollow = the artist\'s own interpretive mark (sketch, drawing). This is the same dot convention used for provenance confidence on artwork pages — keep it consistent, don\'t invent a new meaning for it here.',
      },
    },
    {
      name: 'layoutVariant',
      type: 'select',
      required: true,
      defaultValue: 'full-width',
      options: [
        { label: 'Full width', value: 'full-width' },
        { label: 'Paired (diptych)', value: 'paired' },
        { label: 'Offset small', value: 'offset-small' },
      ],
      admin: {
        description: 'See Part 3.3 for how each variant renders. "Paired" entries must come in adjacent twos — see Do NOT section.',
      },
    },
    {
      name: 'rotation',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Optional slight rotation in degrees, e.g. -1.2. Intended for offset-small entries (sketches, ephemera) to give them a handled, physical quality. Leave 0 for documentation photographs — do not rotate installation/gallery photos.',
      },
    },
  ],
}
```

✓ Field visible in Payload admin under Artist singleton. Can add, reorder, and remove photo entries. Both selects show correct options with sensible defaults.

### 1.2 Closing statement field

```ts
{
  name: 'statementClosingLine',
  type: 'text',
  localized: true,
  admin: {
    description: 'Optional. The single line that closes the Statement page as a full-bleed typographic moment, separate from the running prose (see ClosingStatement component, Part 3.4). If left empty, the page simply ends after the last prose paragraph with no closing block. This does not need to be removed from the prose body itself if the artist wants it stated twice — that repetition is an intentional rhetorical choice, not a bug.',
  },
},
```

### 1.3 Pull quote — no new field, reuse Lexical blockquote

Do **not** add a separate `statementPullQuote` field. Instead, the artist marks the line as a blockquote directly in the `statementFull` richText editor (Lexical's native blockquote toolbar option). The custom renderer for this page intercepts blockquote nodes and applies the pull-quote treatment instead of default `<blockquote>` styling.

This keeps the pull quote's position fully under editorial control (it sits wherever the artist places it in the text, no positional logic to maintain) and avoids parsing/extracting from prose. It also means an artist can change which line is pulled just by moving the blockquote marker, with zero code changes.

**Do NOT** auto-select a sentence by length, position, or keyword matching. **Do NOT** build a separate field for this — one blockquote per statement is the expected usage, but if an artist marks two, render both; that's an editorial choice, not an error condition.

---

## Part 2 — Page structure

### 2.1 File locations

```
src/app/(public)/statement/
  page.tsx                       ← server component, fetches artist singleton
src/components/Statement/
  Statement.tsx                  ← main layout
  StatementProse.tsx              ← richText body, custom blockquote → pull-quote rendering
  StatementPhotoSequence.tsx      ← groups statementPhotos[] into rendered blocks
  StatementPhotoItem.tsx          ← single photo + dot-marker caption
  StatementClosing.tsx            ← full-bleed closing block
```

### 2.2 Data fetching

Server component. Fetch the Artist singleton including `statementFull`, `statementPhotos` (full array, not just IDs — populate `image`), `statementClosingLine`.

```ts
// page.tsx (server component)
import { getPayload } from 'payload'
import config from '@payload-config'
import Statement from '@/components/Statement/Statement'

export default async function StatementPage() {
  const payload = await getPayload({ config })
  const artist = await payload.findGlobal({ slug: 'artist' })
  return <Statement artist={artist} />
}
```

### 2.3 Section order

1. Header block — name, birth year + place, "lives and works in [current locations]" (port as-is from existing page, same `Artist.locations` source as Bio)
2. Close button — position per `design-system.md` Statement row (`45px / 62px / 79px / 108px`), no change
3. Header overlay "STATEMENT" decorative background text — existing pattern, no change
4. `StatementProse` — the richText body, opening paragraph gets the drop cap, any blockquote nodes render as pull-quotes inline at their authored position
5. `StatementPhotoSequence` — the photo sequence, rendered after the full prose body
6. `StatementClosing` — full-bleed closing block, only if `statementClosingLine` is populated

No sidebar, no second column — this stays single-column exactly like Bio. The pull-quote and the closing block are the only elements that break the column width within an otherwise constrained-width page (see Part 3.2 and 3.4 for exact bleed rules).

---

## Part 3 — Component specs

### 3.1 StatementProse — drop cap

The opening paragraph of `statementFull` gets a drop cap on its first letter. Detect "opening paragraph" as the first rendered `<p>` node from the richText output — not a special field, not author-marked.

```css
.statement-prose > p:first-of-type::first-letter {
  font-family: var(--font-display); /* Staatliches */
  font-size: 3.25rem;
  line-height: 0.8;
  float: left;
  padding: 0.1rem 0.5rem 0 0;
}
```

**Do NOT** apply the drop cap to any paragraph other than the first. **Do NOT** apply it if the first paragraph is shorter than ~40 characters (a very short opening line looks broken with a drop cap) — gate on character count, fall back to normal styling below that threshold.

### 3.2 StatementProse — pull-quote rendering

In the Lexical → React conversion for this page only, intercept `blockquote` nodes:

```tsx
function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <div className="statement-pullquote">
      <p>{children}</p>
    </div>
  )
}
```

```css
.statement-pullquote {
  margin: 1.5rem 0 1.5rem -1.125rem; /* slight negative margin for breakout feel within the existing column */
  padding: 1.125rem 0 1.125rem 1.125rem;
  border-left: 2px solid var(--accent-teal); /* #9DC3C2 */
  font-family: var(--font-condensed); /* Barlow Condensed */
  font-weight: 500;
  font-size: 1.375rem;
  line-height: 1.4;
  color: var(--accent-teal-dark); /* a darkened teal for text-on-light-bg contrast, not the raw accent hex — define this token in design-system.md if it doesn't already exist */
}
```

Width stays within the existing prose column — this is a left-border treatment, not a full-bleed break. Reserve full-bleed for the closing block only (Part 3.4), so the page has exactly one moment of real visual rupture, not several competing ones.

**Do NOT** style default `<blockquote>` elsewhere on the site to match this — this treatment is specific to the Statement page's authorial voice. If blockquotes appear in other richText fields (Bio, CV notes), they keep default styling unless a future spec says otherwise.

### 3.3 StatementPhotoSequence — layout variants

Iterate `statementPhotos` in order and group consecutive `paired` entries into diptychs; everything else renders per its own variant.

```tsx
function StatementPhotoSequence({ photos }: { photos: StatementPhoto[] }) {
  const blocks = groupPhotosIntoBlocks(photos)
  return (
    <div className="statement-photo-sequence">
      {blocks.map((block, i) =>
        block.type === 'pair'
          ? <PhotoDiptych key={i} left={block.items[0]} right={block.items[1]} />
          : <StatementPhotoItem key={i} photo={block.items[0]} />
      )}
    </div>
  )
}
```

**Grouping logic (`groupPhotosIntoBlocks`):** walk the array; when a `paired` entry is found, check the next entry. If it's also `paired`, consume both into one diptych block. If the next entry is not `paired` (including end-of-array), render the lone `paired` entry as `full-width` instead and log a console warning in dev — do not silently break the layout, and do not leave a half-empty diptych slot.

**Variant rendering:**

- `full-width`: image at full prose-column width, `aspect-ratio` from the upload's stored dimensions (do not force a fixed aspect ratio — respect what `master-schema-spec.md` already stores per-image), `object-fit: contain` background neutral.
- `paired`: two images side by side, `flex: 1.3` / `flex: 1`-ish asymmetric split (not a strict 50/50 — see mockup proportions), second image's figure vertically offset downward slightly (`align-self: flex-end`) to avoid a static grid feel. Gap `10px`.
- `offset-small`: image at roughly 45–50% of column width, left-aligned (not centered), with `rotation` from the field applied via `transform: rotate(Ndeg)`. Intended for sketches/ephemera, not installation photography.

**Caption rendering (`StatementPhotoItem`, shared across all variants):**

```tsx
function PhotoCaption({ caption, imageType }: { caption: string; imageType: 'photograph' | 'rendering' }) {
  return (
    <figcaption className="statement-caption">
      <span className={imageType === 'photograph' ? 'dot dot-solid' : 'dot dot-hollow'} />
      {caption}
    </figcaption>
  )
}
```

```css
.dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.dot-solid { background: var(--accent-teal); }
.dot-hollow { background: none; border: 1px solid var(--accent-teal); }
.statement-caption {
  font-style: italic;
  font-size: 0.6875rem; /* matches the existing "size converted" type scale step in design-system.md, not a new size */
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
```

This dot convention deliberately echoes the provenance solid/hollow marker used on artwork pages (`artwork-page-layer-reorganization-addendum.md`) — reuse the same two CSS classes if they already exist as a shared utility rather than redefining them here. Check `src/styles/` for an existing `.dot-solid`/`.dot-hollow` pair before writing new ones.

**Do NOT:**
- Do not use `object-cover` on any statement photo — same rule as artwork images sitewide, use `object-contain` or natural aspect ratio.
- Do not apply `rotation` to any `imageType: 'photograph'` entry by default — rotation is for renderings/ephemera. If an artist explicitly sets rotation on a photograph entry, respect it (their call), but the field default and admin description should discourage it.
- Do not hardcode which photo gets which variant in component code — it's all driven by the `layoutVariant` field per entry.

### 3.4 StatementClosing

Only renders if `statementClosingLine` is non-empty.

```tsx
function StatementClosing({ line }: { line: string }) {
  return (
    <div className="statement-closing">
      <p>{line}</p>
    </div>
  )
}
```

```css
.statement-closing {
  margin: 2rem calc(-1 * var(--page-padding)) 0; /* full-bleed, cancels the page's own horizontal padding */
  padding: 2.5rem 2rem;
  background: #1F3331; /* dark teal-black, defined once here — add to design-system.md as a named token if this pattern gets reused elsewhere, do not invent a second dark value */
  text-align: center;
}
.statement-closing p {
  font-family: var(--font-display); /* Staatliches */
  font-size: 1.875rem;
  letter-spacing: 0.5px;
  color: var(--accent-teal);
  line-height: 1.3;
  margin: 0;
}
```

This is the one place on the page allowed to break full-bleed. The pull-quote (3.2) stays inside the column on purpose — if both moments went full-bleed, neither would read as special.

**Do NOT** make this component sticky, animated, or clickable. It's a typographic full stop, not a CTA.

---

## Part 4 — Design constraints (apply across this page)

- Outer page padding, close button position, header overlay — unchanged, see `design-system.md` Section 5
- Prose paragraph styling outside of the drop-cap/pull-quote exceptions above — unchanged from current implementation
- `--accent-teal` (#9DC3C2) is the only accent color introduced on this page — do not add a second accent color
- All breakpoints use `s:` / `m:` / `l:` / `xl:` — never default Tailwind breakpoints
- The `paired` diptych and `offset-small` variants should collapse to stacked full-width below `m:` — no side-by-side layout on mobile
- No infinite scroll, no sticky elements anywhere on this page (consistent with Contact page rule in `contact-page-spec.md` Part 6)

---

## Part 5 — What NOT to do

- ❌ Do not auto-extract the pull quote from prose by length/position/keyword — it's an authored Lexical blockquote, full stop
- ❌ Do not add a `statementPullQuote` text field — would create two sources of truth for the same content
- ❌ Do not let a lone unpaired `paired`-variant photo silently disappear or break the grid — fall back to full-width and warn in dev
- ❌ Do not reuse `grid-caption-centering-and-landscape-boost.md` logic here — that spec is for the artwork browsing grid specifically, this page's photo sequence is narrative, not a grid
- ❌ Do not invent a new dot-marker meaning — reuse the existing solid/hollow provenance convention's visual language (different semantic meaning here — documentation vs. rendering, not fact vs. inference — but the same visual grammar)
- ❌ Do not apply the full-bleed closing-block treatment anywhere else on the page besides the one closing block
- ❌ Do not rotate documentation photographs by default
- ❌ Do not style default `<blockquote>` sitewide based on this spec — scoped to Statement page only

---

## Part 6 — Build order

**Step 1 — Schema**
Add `statementPhotos[]` and `statementClosingLine` to `src/collections/Artist.ts` per Part 1.1–1.2. Confirm `statementFull` already exists (per `master-schema-spec.md` Section 4.3 — it does, no change needed there).
✓ Both fields visible and usable in Payload admin. Array supports add/reorder/remove.

**Step 2 — Content migration**
Populate `statementPhotos` with the 4 existing photos. Set `imageType: 'photograph'` for the three installation shots, `imageType: 'rendering'` for the sketch. Set `layoutVariant`: first photo `full-width`, second and third `paired`, sketch `offset-small`. Set `rotation: -1.2` on the sketch only. Set `statementClosingLine` to "Art is bigger than the Art World." Mark the chosen sentence as a blockquote in the `statementFull` Lexical editor.
✓ All 4 photos present with correct `imageType`/`layoutVariant`. One blockquote marked in the richText. Closing line populated.

**Step 3 — page.tsx and data fetching**
Build the server component per Part 2.2.
✓ `console.log` confirms `statementPhotos[].image` is populated (not just an ID) and `statementClosingLine` comes through.

**Step 4 — StatementProse**
Build drop cap (3.1) and pull-quote interception (3.2).
✓ First paragraph shows the drop cap (and only the first paragraph). The marked blockquote renders with teal left-border treatment, not default blockquote styling. No other blockquotes exist yet to test against, but verify the component doesn't error if zero or multiple blockquotes are present.

**Step 5 — StatementPhotoSequence + StatementPhotoItem**
Build per Part 3.3, including `groupPhotosIntoBlocks`.
✓ Sequence renders: full-width photo, then a diptych pair, then the offset-small sketch with rotation applied. Captions show correct solid/hollow dots matching `imageType`. Test the fallback by temporarily setting a lone photo to `paired` with no adjacent pair — confirm it renders full-width with a console warning, not a broken layout.

**Step 6 — StatementClosing**
Build per Part 3.4.
✓ Full-bleed dark block renders below the photo sequence with the closing line in Staatliches/teal. Confirm it's absent entirely when `statementClosingLine` is empty (test by temporarily clearing the field).

**Step 7 — Full page review**
Check against the current live page at all four breakpoints (`s:`/`m:`/`l:`/`xl:`). Confirm diptych and offset-small variants collapse to stacked full-width below `m:`. Confirm close button and header overlay positions are unchanged from before this spec.
✓ Visual match to the approved mockup direction at desktop width. No layout breakage at any breakpoint. No regressions to Bio page (shared chrome/padding rules untouched).

---

*Statement page redesign spec · bernardbolter.com · June 2026*

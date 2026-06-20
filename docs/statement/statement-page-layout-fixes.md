# Statement Page — Layout Fixes
## bernardbolter.com · `/statement` · June 2026

*Fix addendum to `statement-page-redesign-spec.md`. Scope: two corrections based on the first build pass. Read alongside that spec — this doesn't replace it, it corrects Part 2.3 (header) and Part 3.3 (photo variants).*

---

## Part A — Remove the redundant identity header block

The Statement page currently repeats name / birth year / "lives and works" — already shown in the persistent nav/info panel on every page. Cut it from this page specifically.

**Do NOT** remove this block from `Bio.tsx` or anywhere else — it's correct there (per `bio-page-spec.md` Part 2.3, Bio is the one page where that identity block is the primary content, not a repeat). This change is scoped to `Statement.tsx` only.

**Revised section order for Statement page:**

1. Close button (position unchanged — `45px / 62px / 79px / 108px` per `design-system.md`)
2. Header overlay "STATEMENT" decorative background text (unchanged)
3. `StatementProse`
4. `StatementPhotoSequence` (revised — see Part B)
5. `StatementRelatedWorks` (if built — see `statement-page-jsonld-and-related-works-addendum.md`)
6. `StatementClosing` (if `statementClosingLine` is populated)

✓ Page loads directly into the prose body below the close button and header overlay — no name/birth/lives line anywhere on this page. Confirm the info panel (left side, persistent across pages) still shows that information — it isn't being removed from the site, just de-duplicated from this one page.

---

## Part B — Simplify photo sequence to a uniform 2-column grid

The `full-width` / `paired` / `offset-small` variant system from `statement-page-redesign-spec.md` Part 3.3 didn't render correctly and is more complexity than these source images can support right now — they're lower-resolution scans/photos, and a large full-bleed treatment exposes that. Replace it with one simple, uniform treatment: a 2-column grid, every photo the same size class, no special-casing.

### Schema change — remove `layoutVariant` and `rotation`

These two fields on `statementPhotos` (added in the original spec) are no longer used. Remove them from the array definition in `src/collections/Artist.ts`:

```ts
{
  name: 'statementPhotos',
  type: 'array',
  admin: {
    description: 'Photo sequence on the Statement page. Order here controls display order. Renders as a uniform 2-column grid — no per-photo layout control needed.',
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
        description: 'Drives the caption dot: solid = documentary photograph, hollow = the artist\'s own interpretive mark.',
      },
    },
  ],
}
```

If `layoutVariant` and `rotation` data already exist on the live record from the first build pass, clearing the fields will drop that data — confirm with the artist before running the migration that removing data on those two fields is fine (it should be: the values were never rendering correctly, so nothing visible is lost).

**Keep `imageType`** — the solid/hollow caption dot is working and should stay exactly as-is.

### Component — `StatementPhotoSequence.tsx` rewrite

Replace the grouping/variant logic entirely with a plain grid:

```tsx
function StatementPhotoSequence({ photos }: { photos: StatementPhoto[] }) {
  return (
    <div className="statement-photo-grid">
      {photos.map((photo, i) => (
        <StatementPhotoItem key={i} photo={photo} />
      ))}
    </div>
  )
}
```

```css
.statement-photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 32px 0;
}
.statement-photo-grid img {
  width: 100%;
  height: auto;
  object-fit: contain; /* never object-cover — same rule as everywhere else on the site */
}
```

**Odd photo count:** if `photos.length` is odd, the last item spans both columns (`grid-column: 1 / -1`) rather than leaving an awkward empty slot or stretching to fill. Apply this via `:last-child` when `photos.length % 2 !== 0` (a simple conditional class on the last `StatementPhotoItem`, not a CSS-only `:nth-child` trick that would break if the count changes).

**Responsive:** below `m:`, drop to a single column (`grid-template-columns: 1fr`) — same breakpoint and behavior as the rest of the page's responsive rules, nothing new here.

`StatementPhotoItem` and its caption (dot marker + italic caption text) stay exactly as already built — no changes to that component, only to how the sequence wraps it.

### Caption dot color — verify

The dot marker in the current build is rendering with a greenish/olive tint rather than the intended teal. Before assuming it's a code bug, check:
1. Is the component using the actual `--accent-teal` design token (`#9DC3C2`), or a hardcoded/approximate hex that drifted?
2. Is there a CSS filter, opacity stack, or blend mode anywhere in a parent element affecting it?

✓ Inspect the computed style of `.dot-solid` in devtools — background-color should resolve to exactly `#9DC3C2`, not a nearby green.

### Do NOT

- Do not reintroduce per-photo size or position logic — that's explicitly descoped for now, given image quality
- Do not force-crop images to make the grid cells perfectly uniform — `object-fit: contain` and `height: auto` mean cells can have slightly different heights depending on each photo's aspect ratio; that's fine and expected, do not fight it with `aspect-ratio` overrides that would crop
- Do not apply rotation or any other "physical object" styling to any photo for now — can revisit once final, higher-quality images are in place

---

## Build order

**Step 1 — Schema**
Remove `layoutVariant` and `rotation` fields from `statementPhotos` in `src/collections/Artist.ts`. Confirm with artist before saving if existing records have data in those fields.
✓ Fields no longer present in Payload admin. `imageType` and `caption` still present and unaffected.

**Step 2 — Statement.tsx header removal**
Remove the identity header block from `Statement.tsx` only.
✓ Page renders without name/birth/lives line. Bio page unaffected — spot check.

**Step 3 — StatementPhotoSequence rewrite**
Replace per Part B.
✓ All four photos render in a clean 2×2 grid at `m:`+ width. Single column below `m:`. Captions with correct solid/hollow dots beneath each photo, dot color confirmed as exact `#9DC3C2`.

**Step 4 — Full page review**
Compare against the uploaded screenshot. Confirm header is gone, photos are in pairs, captions are legible and correctly dotted, drop cap on the opening paragraph is unaffected by these changes.
✓ Visual match to the simplified direction. No regressions to the prose styling or close button position.

---

*Statement page layout fixes · bernardbolter.com · June 2026*

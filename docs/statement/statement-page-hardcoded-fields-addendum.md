# Statement Page — Hardcoded Section Fields Addendum
## bernardbolter.com · `/statement` · June 2026

*This supersedes `statement-page-inline-blocks-addendum.md` entirely — do not build the Lexical `BlocksFeature`/`PhotoPairBlock` approach described there. If Cursor has already started that work, roll it back. This addendum still builds on `statement-page-redesign-spec.md` (drop cap, closing block, related works) and `statement-page-layout-fixes.md` (the 2-column photo grid CSS, dot-marker captions) — those pieces are reused as-is, just fed by different fields.*

---

## Part 0 — What's changing and why

The Lexical-blocks approach gave full drag-and-drop placement control, but at real implementation cost — a custom block type, editor wiring, a second rendering path inside the richText converter. Simpler trade: a fixed number of explicit fields, one per section of the page, rendered in a fixed component order. No custom Lexical blocks, no in-editor placement logic.

The cost is exactly what it sounds like — if the statement text is revised later, the split fields need to be manually updated to match, by hand. That's an accepted tradeoff: editorial discipline instead of engineering complexity. `statementFull` (the single uninterrupted richText field that already exists) stays in the schema as the canonical complete text — used for JSON-LD, press kit, grant applications, anywhere the whole statement is needed as one block — but it is **not** what renders on the page itself anymore. The page renders from the split fields below.

---

## Part 1 — Schema: split fields replace `statementFull` for on-page rendering

Add four new fields to the Artist singleton. `statementFull` is unchanged and stays in the schema (see Part 3).

```ts
{
  name: 'statementOpening',
  type: 'richText',
  localized: true,
  admin: {
    description: 'Opening section of the statement, rendered above the scene photos. The drop cap applies to this section\'s first paragraph. This is a manually-maintained excerpt of statementFull, not computed from it — if the statement is revised, update both fields.',
  },
},
{
  name: 'statementSceneImages',
  type: 'array',
  admin: {
    description: 'Photos documenting the scene described in statementOpening. Renders as a 2-column grid directly below it, using the same grid treatment built for the original photo sequence.',
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
},
{
  name: 'statementPullQuote',
  type: 'text',
  localized: true,
  admin: {
    description: 'The single line rendered as a breakout pull quote, between the scene photos and the rest of the statement. Usually a sentence that also appears somewhere in statementOpening or statementClosingBody — that duplication is fine, this field is a visual emphasis device, not a unique piece of content. Copy the sentence in manually; nothing auto-extracts it.',
  },
},
{
  name: 'statementClosingBody',
  type: 'richText',
  localized: true,
  admin: {
    description: 'The remainder of the statement, rendered after the pull quote, through to (but not including) the closing line. No drop cap here. Manually-maintained excerpt of statementFull — same caveat as statementOpening.',
  },
},
```

`statementClosingLine` (full-bleed thesis block) and `statementRelatedWorks` are unchanged from the earlier specs — they're still separate fields, still render after everything else.

### 1.1 Remove fields from the abandoned approaches

- Delete `statementPhotos` if it still exists from the original variant-based spec (`statement-page-layout-fixes.md` already simplified it; this addendum removes the field entirely in favor of `statementSceneImages`)
- Do not build `PhotoPairBlock` or wire `BlocksFeature` into `statementFull` — that entire approach from `statement-page-inline-blocks-addendum.md` is dropped

---

## Part 2 — Components

### 2.1 Section order in `Statement.tsx`

```
1. Close button
2. Header overlay "STATEMENT"
3. StatementOpening        ← statementOpening, drop cap on first paragraph
4. StatementSceneImages    ← statementSceneImages, 2-column grid
5. StatementPullQuote      ← statementPullQuote, breakout treatment
6. StatementClosingBody    ← statementClosingBody, no drop cap
7. StatementRelatedWorks   ← unchanged from jsonld-and-related-works addendum
8. StatementClosing        ← unchanged, fed by statementClosingLine
```

### 2.2 StatementOpening

Plain richText render of `statementOpening`. Drop cap CSS (`statement-page-redesign-spec.md` Part 3.1) applies to this component's first paragraph specifically — not shared with `StatementClosingBody`, which starts mid-essay and should never get a drop cap.

```css
.statement-opening > p:first-of-type::first-letter {
  font-family: var(--font-display);
  font-size: 3.25rem;
  line-height: 0.8;
  float: left;
  padding: 0.1rem 0.5rem 0 0;
}
```

Scope this rule to `.statement-opening` specifically (not a generic `.statement-prose` class shared across both richText components) so it can never accidentally apply to `StatementClosingBody`.

### 2.3 StatementSceneImages

Identical component/CSS to the one built in `statement-page-layout-fixes.md` Part B — same `.statement-photo-grid` class, same `object-fit: contain`, same odd-count full-span fallback, same `StatementPhotoItem` sub-component for the dot-marker caption. Only the data source changes (`statementSceneImages` instead of the old `statementPhotos`).

### 2.4 StatementPullQuote

```tsx
function StatementPullQuote({ line }: { line: string }) {
  if (!line) return null
  return (
    <div className="statement-pullquote">
      <p>{line}</p>
    </div>
  )
}
```

Same visual treatment as originally specced (`statement-page-redesign-spec.md` Part 3.2) — teal left border, Barlow Condensed, breaks slightly left of the column but stays within the page's outer padding (not full-bleed; full-bleed is reserved for `StatementClosing` only). The only change from the original spec is the data source: a plain `text` field instead of intercepting a Lexical blockquote node. Delete the blockquote-interception logic from `StatementProse` if it was built — there is no `StatementProse` component anymore, it's split into `StatementOpening` and `StatementClosingBody`.

Condition: render nothing if `statementPullQuote` is empty, same pattern as `StatementClosing`.

### 2.5 StatementClosingBody

Plain richText render of `statementClosingBody`, identical prose styling to `StatementOpening` minus the drop cap.

---

## Part 3 — `statementFull` stays, repurposed

`statementFull` remains in the schema exactly as originally defined (`master-schema-spec.md` Section 4.3) — full richText, localized. It is no longer rendered on the Statement page. Its remaining jobs:

- **JSON-LD `text` field** — `statement-page-jsonld-and-related-works-addendum.md` Part 3.5 already specified extracting the JSON-LD `text` from `statementFull`, not from page-rendered content. That's still correct and needs no change — `statementFull` never contained embedded photo blocks in this architecture, so the block-skipping logic described in the now-superseded inline-blocks addendum's Part 3 is unnecessary. Plain paragraph-to-text extraction is sufficient.
- **Press kit / grant applications / any other context that needs the complete, unbroken statement as a single document**

**Do NOT** delete `statementFull` or treat it as dead weight — it's the canonical record. The split fields (`statementOpening`, `statementSceneImages`, `statementPullQuote`, `statementClosingBody`) are a presentational re-authoring of the same underlying statement for this one page's layout.

**Editorial discipline note for the artist:** when the statement is revised, update `statementFull` first (it's the source of truth for meaning), then manually re-split the changes into the four page fields. There's no system enforcement keeping these in sync — if they drift, nothing breaks technically, but the page and the "official" statement text could say slightly different things. Worth a quick read-through of both after any edit.

---

## Part 4 — Content migration

One-time editorial task in Payload admin:

1. Copy paragraphs 1–2 of the current `statementFull` (the SFMOMA story, through "...No idea if it's still there.") into `statementOpening`
2. Add the four existing photos to `statementSceneImages` in order (installation shot, museum-guest shot, discovery shot, sketch) — same `imageType` assignments as before (photograph/photograph/photograph/rendering)
3. Copy the sentence "You can't map every step. You make the work, you trust it has a life of its own, and you play the long game — planting seeds without knowing if or when they'll grow." into `statementPullQuote`
4. Copy the remainder of `statementFull` (from "That experience taught me something I've never forgotten." through "...That's the conversation I started by hanging a painting where I wasn't supposed to.") into `statementClosingBody` — this can include the pull-quote sentence again inline if it reads better that way, or be trimmed to skip it; artist's call, both are fine per the duplication note in Part 1
5. Confirm `statementClosingLine` still holds "Art is bigger than the Art World." (unchanged from earlier spec, should already be set)
6. Leave `statementFull` exactly as it currently is — the complete, unbroken version

✓ Page renders: opening paragraphs → 2×2 photo grid → pull quote → remaining paragraphs → related works → closing line. `statementFull` is untouched and still holds the complete text for non-page uses.

---

## Part 5 — Do NOT

- Do not build the Lexical `BlocksFeature`/`PhotoPairBlock` system — superseded, see header of this document
- Do not render `statementFull` anywhere on the public Statement page
- Do not apply the drop-cap CSS rule to `StatementClosingBody` — first-paragraph styling is exclusive to `StatementOpening`
- Do not auto-extract `statementPullQuote` from `statementOpening` or `statementClosingBody` — it's a manually copied, separately authored field
- Do not delete `statementFull` — it remains the canonical source for JSON-LD and any non-page use

---

## Build order

**Step 1 — Schema**
Add `statementOpening`, `statementSceneImages`, `statementPullQuote`, `statementClosingBody` to `src/collections/Artist.ts` per Part 1. Remove `statementPhotos` if present. Confirm `statementFull` is untouched.
✓ All four new fields visible in Payload admin. `statementFull` still present and unchanged. `statementPhotos` no longer exists.

**Step 2 — Components**
Build `StatementOpening.tsx`, `StatementSceneImages.tsx` (reusing the existing grid CSS/logic), `StatementPullQuote.tsx`, `StatementClosingBody.tsx` per Part 2. Update `Statement.tsx` section order. Delete any `StatementProse.tsx` / `StatementPhotoSequence.tsx` / `PhotoPairBlock.ts` files left over from the superseded approach.
✓ All four components render in the correct order. Drop cap appears only on the very first paragraph of the page. Photo grid matches the existing 2-column treatment exactly. Pull quote renders only when `statementPullQuote` is non-empty.

**Step 3 — Content migration**
Perform Part 4's editorial steps in Payload admin.
✓ Live page matches intended structure end to end. `statementFull` confirmed unchanged and still holds the complete statement.

**Step 4 — JSON-LD check**
No code change expected here (Part 3 confirms the existing JSON-LD spec already pointed at `statementFull`) — just verify.
✓ Generated `text` field in the Statement page's JSON-LD still reads as the complete statement, unaffected by the page-rendering changes.

**Step 5 — Full review**
Check all four breakpoints. Confirm photo grid collapses to one column below `m:`. Confirm pull quote, drop cap, and closing block all render correctly with the new field structure.
✓ Visual match to the intended structure. No regressions to close button position, header overlay, or related-works/closing sections inherited from earlier specs.

---

*Statement page hardcoded section fields addendum · bernardbolter.com · June 2026*

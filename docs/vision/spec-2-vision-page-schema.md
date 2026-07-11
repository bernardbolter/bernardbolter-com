# Spec 2 — Vision Page & Schema
*bernardbolter.com · Cursor Implementation Spec · July 2026*

**This spec supersedes `embedding-page-cursor-brief.md` entirely.** Read that document for historical context only — do not implement from it. This document is the single source of truth for the vision page and all related schema changes.

Read alongside: `design-system.md`, `artist-archive-schema-final.md`, `artwork-page-layer-reorganization-addendum.md`, `Spec 1 — Image Resizing & R2 Storage`

---

## What this spec covers

1. Route rename — `/[slug]/embedding` → `/[slug]/vision`
2. Schema changes — `embeddings` array, `visionAnalyses` array, field rename
3. Vision page full redesign — embeddings section + vision analyses section
4. Artwork page additions — latest vision analysis card + visual similarity card
5. Corpus endpoint update
6. JSON-LD updates

---

## 1. Route rename

```
FROM: src/app/(public)/[slug]/embedding/page.tsx
TO:   src/app/(public)/[slug]/vision/page.tsx
```

Add a 301 redirect in `next.config.js`:

```javascript
async redirects() {
  return [
    {
      source: '/:slug/embedding',
      destination: '/:slug/vision',
      permanent: true,
    },
  ]
},
```

The nav back-link behaviour from the old spec carries over unchanged: on this page, the back-link reads `← Back to [artwork title]` and links to `/[slug]`.

---

## 2. Schema changes

### 2a. Rename `artism:clipEmbeddingEndpoint` → `artism:visionPageUrl`

Everywhere this field appears:
- Payload Artwork collection field definition
- `generateArtworkJsonLd.ts`
- `/api/corpus` output
- Any component that reads or links to this value

The value changes from `/[slug]/embedding` to `/[slug]/vision` — update accordingly.

### 2b. `embeddings` array — Payload Artwork collection

**Architecture note — critical:** The actual embedding vectors are stored in dedicated pgvector columns in Neon, NOT in this array. The array stores metadata only. This separation is required for similarity search performance.

Current pgvector columns:
- `clip_embedding vector(768)` — already exists
- `dinov2_embedding vector(1024)` — add when DINOv2 is implemented (not this spec)

The `embeddings` array in Payload:

```typescript
embeddings: {
  type: 'array',
  admin: { description: 'Metadata for each embedding model run. Vectors stored in pgvector columns, not here.' },
  fields: [
    {
      name: 'model',
      type: 'select',
      options: [
        { label: 'CLIP ViT-L/14', value: 'clip-vit-large-patch14' },
        { label: 'DINOv2 Large', value: 'dinov2-large' },
        // Add new models here as they become available
      ],
      required: true,
    },
    {
      name: 'dimensions',
      type: 'number',
      required: true,
      // 768 for CLIP, 1024 for DINOv2
    },
    {
      name: 'pgVectorColumn',
      type: 'text',
      required: true,
      admin: { description: 'The pgvector column name where this model\'s vector is stored, e.g. clip_embedding' },
      // 'clip_embedding' for CLIP, 'dinov2_embedding' for DINOv2
    },
    {
      name: 'generatedDate',
      type: 'date',
    },
    {
      name: 'specUrl',
      type: 'text',
      // URL to the model's spec/paper/HuggingFace card
      // CLIP: 'https://huggingface.co/openai/clip-vit-large-patch14'
      // DINOv2: 'https://huggingface.co/facebook/dinov2-large'
    },
    {
      name: 'shortDescription',
      type: 'text',
      // One line, human-readable, shown on vision page card header
      // CLIP: 'Language-informed visual embedding — 768 dimensions'
      // DINOv2: 'Self-supervised visual embedding, no language influence — 1024 dimensions'
    },
  ],
}
```

**Migrate existing CLIP data:** When this schema is added, populate the first `embeddings` array entry for every artwork that has a `clip_embedding` vector, with:
- `model`: `clip-vit-large-patch14`
- `dimensions`: `768`
- `pgVectorColumn`: `clip_embedding`
- `generatedDate`: from `clip_embedding_generated_at` if it exists, otherwise omit
- `specUrl`: `https://huggingface.co/openai/clip-vit-large-patch14`
- `shortDescription`: `Language-informed visual embedding — 768 dimensions`

### 2c. `visionAnalyses` array — Payload Artwork collection

```typescript
visionAnalyses: {
  type: 'array',
  fields: [
    {
      name: 'text',
      type: 'textarea',
      required: true,
    },
    {
      name: 'model',
      type: 'text',
      required: true,
      admin: { 
        description: 'Exact model version string, e.g. claude-sonnet-4-6, gpt-4o, gemini-2.5-pro, deepseek-vl2' 
      },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
    },
  ],
}
```

**Derived value — latest analysis:** Computed at query time as `visionAnalyses[visionAnalyses.length - 1]` — the last entry in the array. This is what the artwork page displays. No separate field needed.

---

## 3. Vision page — full layout

### Route
`/[slug]/vision`

### Page structure — top to bottom

```
1. Artwork image + title block
2. Embeddings section       ← redesigned from old "similar works + metadata + vector"
3. Vision analyses section  ← new
4. Long-form text panel     ← updated copy (see below)
```

---

### Section 1 — Artwork image + title block

Unchanged from existing embedding page spec:
- Full-width artwork image within content column — use `1200w` derivative per Spec 1
- Title, year, medium below — same typographic treatment as artwork page title block

---

### Section 2 — Embeddings section

**Anchor:** `id="embeddings"`

Heading: `Visual Embeddings` — same section label style as rest of page.

#### When only one embedding model exists (current state — CLIP only):

Render as a single card. No comparison UI yet — that's for when a second model exists.

**Embedding card layout:**

```
┌─────────────────────────────────────────────────────┐
│ [series colour left border]                          │
│                                                      │
│  CLIP ViT-L/14                    [Model spec →]    │
│  Language-informed visual embedding — 768 dimensions │
│  Generated: Mar 2026                                 │
│                                                      │
│  0.234, -0.891, 0.445, 0.112, -0.334, 0.778 ...   │
│  [fading gradient →]                                 │
│                                                      │
│  Via visual similarity:                              │
│  [similar works thumbnails with similarity scores]  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Card details:**
- Model name (`CLIP ViT-L/14`) in Barlow Condensed, medium weight
- `shortDescription` below model name — muted, smaller
- `generatedDate` formatted as `Mon YYYY` — omit if not available, do not fabricate
- `specUrl` as `Model spec →` link — opens in new tab
- Vector tease: first 8–10 values from the pgvector column, comma-separated, monospace, fading right with a gradient. Label above: `The vector · not meant to be read`. Do NOT show the full vector as visible page content — full array lives in JSON-LD only
- Similar works thumbnails below — same as current implementation, showing similarity percentage labeled "similarity" not "match"
- White card, `border: 0.5px solid rgba(0,0,0,0.09)`, series colour left border

#### When multiple embedding models exist (future state):

Render as a card grid — same comparison UI as vision analyses (see Section 3 below). Infrastructure is built now, comparison UI activates naturally when a second card exists. Do not build the comparison UI interaction for a single card — it's unnecessary and confusing.

#### Null state (no embeddings):

Quiet message: `Visual embedding data has not yet been generated for this work.` No broken sections, no error styling.

---

### Section 3 — Vision analyses section

**Anchor:** `id="analyses"`

Heading: `Vision Analyses` — same section label style.

Brief one-line context above the cards: `Visual descriptions produced by different AI models over time. Same prompt, different perspectives.`

#### Default state — card grid

All analyses as compact cards. Wrap grid on desktop, horizontal scroll on mobile.

**Each card:**
- Model name — formatted for readability: `claude-sonnet-4-6` displays as `Claude Sonnet 4.6`, `gpt-4o` as `GPT-4o`, `gemini-2.5-pro` as `Gemini 2.5 Pro`, `deepseek-vl2` as `DeepSeek VL2`
- Date — `Jul 2026`
- Preview: first 2–3 sentences, truncated with ellipsis
- White card, `border: 0.5px solid rgba(0,0,0,0.09)`, series colour left border
- Cursor pointer, subtle hover state

#### Single panel state

Click one card → expands into a full-width reading panel. Remaining cards collapse to a horizontal strip below.

**Panel:**
- White background, series colour left border
- Model name + date as header
- Full analysis text, `line-height: 1.7`
- `×` close button top-right — returns to card grid

**Strip below panel:**
- Selected card visually indicated — filled left border, slightly elevated
- Other cards as compact strip items — model name + date only
- Clicking any strip card replaces the current panel

#### Comparison state — two panels side by side

Click a second card from the strip → two panels side by side.

**Layout:**
- Two equal-width columns, `gap: 1.5rem`
- Each panel: model name + date header, full text, series colour left border, `×` close button
- Strip of remaining cards below both panels as a selector row
- Clicking a strip card replaces the **left** panel
- Closing right panel → returns to single panel state
- Closing left panel → right panel becomes left panel (single panel state)
- Closing both → returns to card grid

**Mobile:** panels stack vertically. Strip becomes horizontal scroll row below.

#### Null state (no analyses):

Quiet message: `No vision analyses yet for this work.` No broken section.

---

### Section 4 — Long-form text panel

Updated copy — replaces the existing "A small, useful thing" text from the old embedding spec. Same muted panel background (`#efeee9`), same generous line-height (1.7–1.8). First line as heading, remaining as prose.

**Do NOT rewrite or paraphrase this copy:**

```
What machines see

This page is a record of how different systems have looked at this work.

The embeddings — rows of numbers generated by models like CLIP and DINOv2 — describe the image mathematically: shapes, colours, spatial relationships, visual texture. They power the similar-works connections above, finding echoes across thirty years of work without any manual tagging. Each model weighs visual features differently. CLIP learned from image-text pairs; DINOv2 learned from images alone. Whether they agree on what's similar is itself informative.

The vision analyses are the language layer — what happens when a model is asked to describe what it actually sees. The same prompt, sent to different models, on different dates. Where they converge, something is probably objectively there in the work. Where they diverge, the work is leaving room for interpretation.

Both are dated and model-tagged because they're not timeless descriptions. They're records of a specific system looking at a specific image at a specific moment. As models improve, the readings get richer. The archive accumulates them all.
```

---

## 4. Artwork page additions

These two cards are added to the artwork page. Both sit in **Layer3ArtistAccount** zone, at the top of that layer — before the existing artist's account content. Check `artwork-page-layer-reorganization-addendum.md` for the current Layer3 position in the render order.

**Render condition for both cards:** only when the relevant data exists. Never show empty card shells.

### Card A — Latest Vision Analysis

**Render when:** `visionAnalyses.length > 0`

```
┌─────────────────────────────────────────────────────┐
│ [series colour left border]                          │
│                                                      │
│  Vision Analysis                                     │
│                                                      │
│  [Full text of visionAnalyses[last].text]           │
│                                                      │
│  View all analyses →                                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

- Label `Vision Analysis` in small caps / subdued uppercase — same style as other section labels
- Full text of the latest analysis — no truncation, no ellipsis
- **No model name, no date** — just the text. This reads as a visual description on the artwork page, not as a machine output. The vision page is where model/date context lives
- Link: `View all analyses →` → `/[slug]/vision#analyses`
- Background: `#efeee9` muted panel — same as long-form text panel on vision page
- Series colour left border

### Card B — Visual Similarity

**Render when:** `clip_embedding IS NOT NULL` (i.e. at least one embedding exists)

```
┌─────────────────────────────────────────────────────┐
│ [series colour left border]                          │
│                                                      │
│  Visual Similarity                                   │
│                                                      │
│  Works with similar visual structure, found by       │
│  comparing image embeddings across the archive.      │
│                                                      │
│  [existing similar works thumbnails strip]           │
│                                                      │
│  Explore visual embeddings →                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

- The existing similar works strip moves into this card — same thumbnails, same size, same behaviour. Do NOT enlarge thumbnails
- One-line explanation above the strip — plain language, no technical vocabulary
- Link: `Explore visual embeddings →` → `/[slug]/vision#embeddings`
- White background, series colour left border, `border: 0.5px solid rgba(0,0,0,0.09)`

**Render order:** Card A (vision analysis) first, Card B (visual similarity) second.

---

## 5. Corpus endpoint update

`/api/corpus` — update each `VisualArtwork` record output:

**Rename field:**
```json
// BEFORE
"artism:clipEmbeddingEndpoint": "https://bernardbolter.com/[slug]/embedding"

// AFTER  
"artism:visionPageUrl": "https://bernardbolter.com/[slug]/vision"
```

**Add `visionAnalyses` when present:**
```json
"artism:visionAnalyses": [
  {
    "@type": "artism:VisionAnalysis",
    "text": "Strong diagonal from lower-left...",
    "artism:model": "claude-sonnet-4-6",
    "dateCreated": "2026-07-08"
  }
]
```
Omit the field entirely when `visionAnalyses` is empty — do not emit an empty array.

**Add `embeddings` when present:**
```json
"artism:embeddings": [
  {
    "@type": "artism:Embedding",
    "artism:model": "clip-vit-large-patch14",
    "artism:dimensions": 768,
    "artism:specUrl": "https://huggingface.co/openai/clip-vit-large-patch14",
    "artism:shortDescription": "Language-informed visual embedding — 768 dimensions",
    "dateCreated": "2026-03-15"
  }
]
```
Note: vectors are NOT included in the corpus output — they are large (768+ floats) and available via the vision page JSON-LD for any system that needs them. The corpus output signals that embeddings exist and which models were used.

**Continue suppressing `artism:reasoningStatus: "stub"`** — only emit when value is `complete` or `enriched`.

---

## 6. Vision page JSON-LD

In `<head>` of `/[slug]/vision`:

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  },
  "@type": "artism:VisionPage",
  "isPartOf": {
    "@type": "VisualArtwork",
    "name": "[artwork.title]",
    "url": "https://bernardbolter.com/[slug]",
    "image": "[direct R2 original URL from imageUrl field]"
  },
  "artism:embeddings": [
    {
      "@type": "artism:Embedding",
      "artism:model": "clip-vit-large-patch14",
      "artism:dimensions": 768,
      "artism:vector": [/* full 768-value array from clip_embedding column */],
      "artism:specUrl": "https://huggingface.co/openai/clip-vit-large-patch14",
      "dateCreated": "[generatedDate if available]"
    }
  ],
  "artism:visionAnalyses": [
    {
      "@type": "artism:VisionAnalysis",
      "text": "...",
      "artism:model": "claude-sonnet-4-6",
      "dateCreated": "2026-07-08"
    }
  ]
}
```

**Notes:**
- Full vector array lives here in JSON-LD — not in visible page content
- `image` field in `isPartOf` must be the direct R2 URL — not a `/_next/image` URL
- Also add `<link rel="image" href="[direct R2 original URL]">` in `<head>` — this is the primary machine-readable image access point per Spec 1
- Omit `artism:visionAnalyses` from JSON-LD when array is empty

---

## Adding a new vision analysis — workflow

No API integration required. Manual entry:

1. Open any vision model chat interface (claude.ai, chatgpt.com, gemini.google.com, chat.deepseek.com)
2. Paste the direct R2 image URL for the artwork (from the artwork's `imageUrl` field in Payload)
3. Use the **standard prompt exactly** — do not vary it across models:

> *"Please give a detailed visual analysis of this artwork — describe the composition, colour palette, spatial structure, mood, and any formal qualities you notice. Be specific and observational rather than interpretive."*

4. Copy the full response
5. In Payload admin → Artwork record → `visionAnalyses` array → Add entry → paste text, enter model string, date auto-fills

**Model string format** — use the exact version string, not the product family name:
- `claude-sonnet-4-6` not `Claude`
- `gpt-4o` not `ChatGPT`
- `gemini-2.5-pro` not `Gemini`
- `deepseek-vl2` not `DeepSeek`

**Priority for first analyses:** run on the 10 fully reasoned exemplar records first — one per series. These are the highest-value starting points and will immediately enrich cross-archive reasoning sessions.

---

## Do NOT

- Do not implement from `embedding-page-cursor-brief.md` — this spec supersedes it entirely
- Do not show model name or date on the artwork page vision analysis card — text only
- Do not truncate text in the reading panel — truncation is for compact cards only
- Do not use `/_next/image` URLs anywhere in JSON-LD or `<link rel="image">` tags — must be direct R2 URLs
- Do not store embedding vectors in the Payload `embeddings` array — vectors live in pgvector columns only
- Do not emit an empty `artism:visionAnalyses` array in corpus or JSON-LD — omit when empty
- Do not fabricate a `generatedDate` — omit if genuinely unavailable
- Do not rewrite or paraphrase the long-form text — it is finalized copy
- Do not build the comparison UI for a single embedding card — it activates when a second model exists
- Do not use "match" anywhere — always "similarity"
- Do not run automated batch vision analysis — each analysis is a deliberate manual act

---

## Verification checklist

**Route and redirect:**
- [ ] `/[slug]/vision` renders correctly
- [ ] `/[slug]/embedding` redirects 301 to `/[slug]/vision` — verify in browser network tab
- [ ] Nav back-link reads `← Back to [artwork title]` on vision page only

**Schema:**
- [ ] `embeddings` array field exists on Artwork collection in Payload
- [ ] `visionAnalyses` array field exists on Artwork collection in Payload
- [ ] All existing CLIP-embedded artworks have a populated `embeddings[0]` entry with correct model, dimensions, pgVectorColumn, specUrl, shortDescription
- [ ] `artism:clipEmbeddingEndpoint` renamed to `artism:visionPageUrl` in schema, JSON-LD, corpus — no references to old field name remain

**Vision page — embeddings section:**
- [ ] Single CLIP embedding card renders with model name, short description, spec link, generated date (or date omitted if unavailable), vector tease, similar works with similarity percentages
- [ ] Vector tease fades out — full array not visible in page source (lives in JSON-LD only)
- [ ] `Model spec →` link opens HuggingFace model card in new tab
- [ ] Null embedding state renders quiet fallback message

**Vision page — vision analyses section:**
- [ ] Card grid renders all analyses with model name (formatted readably), date, preview text
- [ ] Single panel opens on card click, strip appears below
- [ ] Comparison — two panels side by side on second card click (stacked on mobile)
- [ ] Strip card click replaces left panel
- [ ] Close buttons return to correct previous state
- [ ] Null analyses state renders quiet fallback message
- [ ] `#analyses` anchor navigates correctly from artwork page link

**Vision page — long-form text:**
- [ ] Copy matches exactly — do not accept paraphrased version
- [ ] Rendered on `#efeee9` muted panel background

**Vision page — JSON-LD:**
- [ ] `<head>` contains `artism:VisionPage` JSON-LD
- [ ] Full vector array present in JSON-LD
- [ ] `isPartOf.image` is direct R2 URL — not `/_next/image`
- [ ] `<link rel="image">` in `<head>` pointing to direct R2 original URL
- [ ] `artism:visionAnalyses` present in JSON-LD when analyses exist, omitted when empty

**Artwork page:**
- [ ] Vision analysis card (Card A) renders when `visionAnalyses.length > 0`, hidden when empty
- [ ] Card A shows no model name or date — text only
- [ ] Card A `View all analyses →` link navigates to `/[slug]/vision#analyses`
- [ ] Visual similarity card (Card B) renders when clip_embedding exists
- [ ] Card B contains the existing similar works thumbnails — same size, not enlarged
- [ ] Card B `Explore visual embeddings →` link navigates to `/[slug]/vision#embeddings`
- [ ] Card A renders before Card B

**Corpus endpoint:**
- [ ] `artism:visionPageUrl` present, pointing to `/[slug]/vision`
- [ ] `artism:clipEmbeddingEndpoint` no longer present anywhere in corpus output
- [ ] `artism:visionAnalyses` present per record when analyses exist, omitted when empty
- [ ] `artism:embeddings` present per record (without vectors), omitted when no embeddings
- [ ] `artism:reasoningStatus: "stub"` not present in corpus output

---

*Spec 2 — Vision Page & Schema · July 2026*
*Supersedes: `embedding-page-cursor-brief.md`*
*Read alongside: Spec 1 — Image Resizing & R2 Storage, `artwork-page-layer-reorganization-addendum.md`, `design-system.md`*

# Spec 1 — Image Resizing & R2 Storage
*bernardbolter.com · Cursor Implementation Spec · July 2026*

Read alongside: `design-system.md`, `artist-archive-schema-final.md`

This spec supersedes any prior image handling approach. After implementation, Vercel image optimization is completely disabled for artwork images. All artwork image delivery goes directly from Cloudflare R2 via Cloudflare's CDN — zero Vercel transformation cost regardless of traffic.

---

## Why this change

Vercel's Hobby plan includes 1,000 source image optimizations per month. With 216 artworks appearing in grids, artwork pages, similar-works strips, and embedding/vision pages, this limit is hit quickly. Pre-generating derivative sizes on R2 eliminates this cost permanently — R2 storage is $0.015/GB/month and R2-to-Cloudflare CDN egress is free.

---

## Naming convention

```
[slug].jpg              ← original, untouched, never regenerated
[slug]-400w.jpg         ← thumbnail — grids, similar works strips, series pages
[slug]-800w.jpg         ← medium — artwork page standard view
[slug]-1200w.jpg        ← large — artwork page expanded, vision page
```

**Rules:**
- Originals keep their current filename exactly as stored — do NOT rename or move them
- Derivatives are JPG only — no WebP, no AVIF
- All derivatives stored in the same R2 bucket alongside originals
- If an original has a non-standard filename (e.g. `basel-switzerland-composite.jpg`), the derivative naming still uses the artwork slug: `basel-switzerland-400w.jpg`, `basel-switzerland-800w.jpg`, `basel-switzerland-1200w.jpg`
- The source of truth for the original filename is the `imageUrl` field stored on the Artwork record in Payload — always read from there, never construct filenames by assumption

---

## Sharp resize settings

Use the `sharp` npm package for all resizing. It's already available in Node.js environments.

```typescript
const sizes = [
  { suffix: '400w', width: 400 },
  { suffix: '800w', width: 800 },
  { suffix: '1200w', width: 1200 },
]

// For each size:
await sharp(inputBuffer)
  .resize(width, null, {        // constrain width only, height auto
    withoutEnlargement: true,   // never upscale — if original is smaller, skip
    fit: 'inside',
  })
  .jpeg({ quality: 85, progressive: true })
  .toBuffer()
```

**`withoutEnlargement: true` is critical** — some watercolors and drawings may have originals smaller than 1200px. Never upscale. If the original is smaller than a target size, skip that derivative silently — the next size down (or the original) is used instead.

---

## pg-boss jobs

Two jobs. Both use the existing pg-boss instance.

### Job 1 — Backfill existing 216 artworks

**Job name:** `resize-image-backfill`

**Trigger:** Run once manually after deployment. Not triggered automatically.

**Logic:**
```
1. Fetch all published Artwork records from Payload where imageUrl is not null
2. For each artwork:
   a. Fetch the original image buffer from R2 using imageUrl
   b. For each size (400w, 800w, 1200w):
      - Check if [slug]-[suffix].jpg already exists in R2
      - If exists: skip (idempotent — safe to re-run)
      - If not exists: generate with Sharp, upload to R2
   c. Log result per artwork (success / skipped / error)
3. On completion: log total processed, skipped, errored
```

**Error handling:** if a single artwork fails (corrupt image, network error), log the error and continue — do not abort the entire backfill. Failed artworks can be re-queued individually.

**Run via:** a one-off admin route or script, not an automatic trigger. Something like `POST /api/admin/backfill-images` protected by a simple bearer token.

### Job 2 — New artwork upload trigger

**Job name:** `resize-image-on-upload`

**Trigger:** Fired automatically when a new Artwork record is saved in Payload with a non-null `imageUrl`. Use Payload's `afterChange` hook on the Artwork collection.

```typescript
// In Artwork collection config:
hooks: {
  afterChange: [
    async ({ doc, operation }) => {
      if (operation === 'create' || 
         (operation === 'update' && doc.imageUrl !== previousDoc.imageUrl)) {
        await pgBoss.send('resize-image-on-upload', { 
          slug: doc.slug,
          imageUrl: doc.imageUrl 
        })
      }
    }
  ]
}
```

**Logic:** same as backfill for a single artwork — generate 400w, 800w, 1200w. Skip if already exists.

---

## Disable Vercel image optimization

In `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // ... rest of existing config
}
```

**This disables Vercel optimization globally.** All `<Image>` components will serve images as-is. This is correct — artwork images now come from R2 at the right size directly, and UI images (icons, logos, nav elements) are small enough that optimization is not needed.

---

## Component updates

Replace all `<Image>` components that display artwork images with plain `<img>` tags using the appropriate sized R2 URL directly. Do NOT use Next.js `<Image>` for artwork images after this change.

### Size selection logic

```typescript
function getArtworkImageUrl(slug: string, context: 'grid' | 'artwork-page' | 'vision-page' | 'similar-works'): string {
  const base = `https://pub-6a869efbfec4404396a52a3b7056bfc7.r2.dev`
  switch (context) {
    case 'grid':          return `${base}/${slug}-400w.jpg`
    case 'similar-works': return `${base}/${slug}-400w.jpg`
    case 'artwork-page':  return `${base}/${slug}-1200w.jpg`
    case 'vision-page':   return `${base}/${slug}-1200w.jpg`
    default:              return `${base}/${slug}-800w.jpg`
  }
}
```

**Fallback:** if a derivative doesn't exist (e.g. original was smaller than target size), the `<img>` tag's `onerror` should fall back to the original URL. Do not show a broken image.

```html
<img 
  src="[slug]-1200w.jpg"
  onerror="this.src='[original-url]'; this.onerror=null"
  alt="[artwork title]"
/>
```

### Where each size is used

| Context | Size |
|---|---|
| Main artwork grid | 400w |
| Series page grid | 400w |
| Similar works strip (artwork page) | 400w |
| Similar works strip (vision page) | 400w |
| Artwork page main image | 1200w |
| Vision page image | 1200w |
| Artwork page thumbnail in nav/header | 400w |

---

## `<link rel="image">` in artwork page head

Add to the `<head>` of every artwork page (`/[slug]`):

```html
<link rel="image" href="https://pub-6a869efbfec4404396a52a3b7056bfc7.r2.dev/[original-filename]" />
```

This must point to the **original file**, not a derivative. The original has full resolution and is what AI vision models should fetch for analysis.

The value comes from the artwork's `imageUrl` field in Payload — the direct R2 URL stored there. Do NOT construct this URL — read it from the field.

Also add to the vision page head (`/[slug]/vision`) — same URL, same field source.

**Critical:** this must be the direct R2 URL. It must NOT be a `/_next/image?url=...` URL. Verify in browser View Source after implementation.

---

## Do NOT

- Do not rename or move original files — derivatives are additions, not replacements
- Do not generate WebP or AVIF — JPG only
- Do not upscale images smaller than the target derivative size — skip with `withoutEnlargement: true`
- Do not use Next.js `<Image>` component for artwork images after this change
- Do not construct R2 filenames by assumption — always read `imageUrl` from the Artwork record
- Do not use a `/_next/image` URL in the `<link rel="image">` tag — must be direct R2 URL
- Do not abort the backfill job if a single artwork fails — log and continue
- Do not run the backfill job automatically on deploy — trigger manually once

---

## Verification checklist

- [ ] `next.config.js` has `images: { unoptimized: true }` — confirm no Vercel image optimization in dashboard after first page load
- [ ] Backfill job runs successfully — check R2 bucket for `[slug]-400w.jpg`, `[slug]-800w.jpg`, `[slug]-1200w.jpg` alongside originals for a sample of artworks
- [ ] Originals are untouched — same filename, same file size as before
- [ ] Grid pages load artwork thumbnails from `400w` derivatives — confirm in browser network tab (URL should be direct R2 URL, not `/_next/image`)
- [ ] Artwork page loads from `1200w` derivative
- [ ] `onerror` fallback works — temporarily rename a derivative in R2 and confirm original loads instead
- [ ] New artwork upload triggers `resize-image-on-upload` job — confirm derivatives appear in R2 within a few seconds
- [ ] `<link rel="image">` present in `<head>` of artwork pages — confirm via View Page Source
- [ ] `<link rel="image">` points to direct R2 original URL — not a `/_next/image` URL
- [ ] `<link rel="image">` present in `<head>` of vision pages
- [ ] Vercel dashboard image optimization usage shows zero or near-zero after implementation

---

*Spec 1 — Image Resizing & R2 Storage · July 2026*
*Read alongside: Spec 2 — Vision Page & Schema*

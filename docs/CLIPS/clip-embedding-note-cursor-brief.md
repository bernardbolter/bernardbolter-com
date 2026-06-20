# ClipEmbeddingNote — Build & Wire-in

*Adds the "Similar works" thumbnail row and CLIP explainer to the bottom of Layer 3's classification cluster on the single artwork page.*

---

## Context

`Layer3ArtistAccount` already receives `similarWorks` and `hasClipEmbedding` as props from `ArtworkPage.tsx` (the similar-works pgvector query and Payload hydration are already built — see `similarArtworksPage.ts` / `similarity.ts`). This brief adds the missing piece: the component that actually **renders** that data, plus a small adjustment to the upstream fetch limit.

**Note on scope:** This deliberately departs from `artwork-page-layer-reorganization-addendum.md`'s original spec, which described the CLIP explainer as a collapsed-by-default accordion. Bernard reviewed a mockup and chose **always-visible, no collapse** instead — simpler, and the explainer text stays permanently readable rather than hidden behind a click. Three thumbnails, not four, per the same review.

---

## 1. Create `src/components/ClipEmbeddingNote.tsx`

```tsx
// src/components/ClipEmbeddingNote.tsx
//
// Sits at the bottom of Layer3ArtistAccount's classification cluster,
// after tags. Two parts:
//   1. Similar works — three-thumbnail row, only rendered if similarWorks
//      is non-empty (data fetching already handled upstream in ArtworkPage)
//   2. CLIP explainer — always visible, no collapse.
//
// This component does NOT fetch data. It receives everything as props,
// matching the established pattern for Layer0–Layer4 children.

import Link from 'next/link'
import Image from 'next/image'

export interface SimilarWorkItem {
  slug: string
  title: string
  imageUrl: string
}

interface ClipEmbeddingNoteProps {
  artworkSlug: string
  hasClipEmbedding: boolean
  similarWorks: SimilarWorkItem[]
}

export default function ClipEmbeddingNote({
  artworkSlug,
  hasClipEmbedding,
  similarWorks,
}: ClipEmbeddingNoteProps) {
  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      {/* Similar works — three thumbnail row */}
      {similarWorks.length > 0 && (
        <div className="mb-5">
          <div className="mb-3 flex items-baseline gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Similar works
            </h3>
            <span className="text-xs text-gray-400">via visual similarity</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {similarWorks.slice(0, 3).map((work) => (
              <Link
                key={work.slug}
                href={`/${work.slug}`}
                className="group block overflow-hidden rounded-sm bg-gray-50 transition-opacity hover:opacity-80"
              >
                <div className="relative aspect-square w-full">
                  <Image
                    src={work.imageUrl}
                    alt={work.title}
                    fill
                    sizes="(min-width: 768px) 160px, 33vw"
                    className="object-cover"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CLIP explainer — always visible, no collapse */}
      {hasClipEmbedding ? (
        <div className="text-xs leading-relaxed text-gray-500">
          <p className="mb-1.5">
            This work has a machine-readable visual fingerprint — a CLIP
            embedding — that AI systems use to find visually and
            conceptually related work across the archive.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a
              href="https://huggingface.co/openai/clip-vit-large-patch14"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-gray-700"
            >
              What is a CLIP embedding? ↗
            </a>
            <Link
              href={`/${artworkSlug}/embedding`}
              className="underline underline-offset-2 hover:text-gray-700"
            >
              View this work&apos;s embedding →
            </Link>
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          Visual similarity data not yet generated for this work.
        </p>
      )}
    </div>
  )
}
```

---

## 2. Wire it into `Layer3ArtistAccount`

`Layer3ArtistAccount` already receives `artwork`, `similarWorks`, and `hasClipEmbedding` as props (per `ArtworkPage.tsx`). Render `ClipEmbeddingNote` at the very bottom of Layer 3's classification cluster — after the tags/chips block, after art-historical references — as the last thing in the component, before the closing tag.

```tsx
import ClipEmbeddingNote from '@/components/ClipEmbeddingNote'

// ...inside Layer3ArtistAccount's JSX, as the last element:
<ClipEmbeddingNote
  artworkSlug={artwork.slug}
  hasClipEmbedding={hasClipEmbedding}
  similarWorks={similarWorks}
/>
```

**Do not** place this between the intent fields and the art-historical context/references block — those must remain one uninterrupted reading sequence per the existing layer-reorg spec. This component only ever goes at the very end.

---

## 3. Adjust the upstream fetch limit

In `ArtworkPage.tsx`, the call to `getSimilarArtworksForPage` currently requests 4 results:

```tsx
const [similarWorks, hasClipEmbedding] = await Promise.all([
  getSimilarArtworksForPage(artwork.id, 4),
  artworkHasClipEmbedding(artwork.id),
])
```

Change the limit to `3`, matching the component's display count, so the query doesn't fetch and hydrate a fourth artwork that's never rendered:

```tsx
getSimilarArtworksForPage(artwork.id, 3),
```

---

## 4. Confirm `SimilarWorkItem` shape matches reality

This component assumes `similarWorks` items look like:

```ts
{ slug: string, title: string, imageUrl: string }
```

**Verify this against the actual return type of `getSimilarArtworksForPage` / `SimilarArtworkCard`** before wiring in. If the real field names differ (e.g. the image field is nested differently, or named something other than `imageUrl`), either:
- Adjust the `SimilarWorkItem` interface and the `work.imageUrl` reference in this component to match, **or**
- Map the data to this shape in `ArtworkPage.tsx` before passing it down

Do not silently rename fields in the upstream type to match this component — check which direction the mismatch actually goes first.

---

## Do NOT

- Do not reintroduce the collapsed/accordion behavior — this is a deliberate, confirmed departure from the earlier spec
- Do not show more than 3 similar works, even if more are returned
- Do not add a card border or background box around this whole block — it stays plain text + thumbnails, separated only by the top border divider
- Do not make this component fetch its own data — it must remain a pure props-in component, consistent with every other Layer0–Layer4 child
- Do not change "What is a CLIP embedding?" to an internal link — it stays external, pointing to the Hugging Face CLIP model card

---

## Verification checklist

- [ ] `ClipEmbeddingNote.tsx` created at `src/components/ClipEmbeddingNote.tsx`
- [ ] Renders at the bottom of `Layer3ArtistAccount`, after tags/art-historical references, nowhere else
- [ ] Shows exactly 3 thumbnails (or fewer if `similarWorks` has fewer than 3 items) when `similarWorks` is non-empty
- [ ] Shows nothing in the "Similar works" section when `similarWorks` is empty (no empty grid, no heading with no content)
- [ ] When `hasClipEmbedding` is true: explainer paragraph + both links visible, always, no click needed
- [ ] When `hasClipEmbedding` is false: shows only "Visual similarity data not yet generated for this work." — no links, no explainer paragraph
- [ ] "What is a CLIP embedding?" opens `https://huggingface.co/openai/clip-vit-large-patch14` in a new tab
- [ ] "View this work's embedding →" links to `/[slug]/embedding` (this route doesn't render a real page yet — that's separate, upcoming work — confirm the link itself is correctly formed even though the destination is still a stub/404 for now)
- [ ] `getSimilarArtworksForPage` call in `ArtworkPage.tsx` updated to request 3, not 4
- [ ] No console errors, no TypeScript errors on the `SimilarWorkItem` shape

---

*Next piece of work, not part of this brief: the `/[slug]/embedding` page itself (human-readable CLIP embedding detail page) — separate spec already drafted in `clip-embeddings-spec.md`, Part 3.*

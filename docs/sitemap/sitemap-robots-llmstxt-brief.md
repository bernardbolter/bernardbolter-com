# Sitemap, robots.txt, and llms.txt — Cursor Implementation Brief
## bernardbolter.com · Pre-Launch · June 2026

---

## Overview

Three files to add in one pass. All are static or near-static — no complex
logic. Commit each separately so they're easy to revert independently.

---

## Step 1 — Sitemap (`app/sitemap.ts`)

Create `app/sitemap.ts`. Next.js App Router automatically serves this at
`/sitemap.xml` — no additional routing config needed.

```ts
import { getPayload } from 'payload'
import config from '@payload-config'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bernardbolter.com'

  // --- Static pages ---
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl,                    priority: 1.0, changeFrequency: 'weekly'  },
    { url: `${baseUrl}/bio`,           priority: 0.8, changeFrequency: 'monthly' },
    { url: `${baseUrl}/cv`,            priority: 0.8, changeFrequency: 'monthly' },
    { url: `${baseUrl}/statement`,     priority: 0.7, changeFrequency: 'monthly' },
    { url: `${baseUrl}/contact`,       priority: 0.6, changeFrequency: 'yearly'  },
  ]

  // --- Published artworks (exclude fixture slugs) ---
  const artworks = await payload.find({
    collection: 'artworks',
    where: {
      and: [
        { status: { equals: 'published' } },
        { slug: { not_like: '__fixture%' } },
      ],
    },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  const artworkRoutes: MetadataRoute.Sitemap = artworks.docs.map(artwork => ({
    url: `${baseUrl}/${artwork.slug}`,
    lastModified: artwork.updatedAt,
    priority: 0.9,
    changeFrequency: 'monthly' as const,
  }))

  // --- Published series ---
  const series = await payload.find({
    collection: 'series',
    where: { status: { equals: 'published' } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  const seriesRoutes: MetadataRoute.Sitemap = series.docs.map(s => ({
    url: `${baseUrl}/series/${s.slug}`,
    lastModified: s.updatedAt,
    priority: 0.7,
    changeFrequency: 'monthly' as const,
  }))

  // --- Published events with hasPage: true ---
  const events = await payload.find({
    collection: 'events',
    where: {
      and: [
        { status: { equals: 'published' } },
        { hasPage: { equals: true } },
        { slug: { not_like: '__fixture%' } },
      ],
    },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  const eventRoutes: MetadataRoute.Sitemap = events.docs.map(event => ({
    url: `${baseUrl}/events/${event.slug}`,
    lastModified: event.updatedAt,
    priority: 0.6,
    changeFrequency: 'yearly' as const,
  }))

  return [
    ...staticRoutes,
    ...artworkRoutes,
    ...seriesRoutes,
    ...eventRoutes,
  ]
}
```

### Do NOT include

- Draft records of any collection
- `/admin/*`, `/api/*`, `/preview/*`
- Any slug beginning with `__`
- `/[slug]/embedding` — CLIP embedding detail pages

### Verification

- [ ] `/sitemap.xml` returns valid XML
- [ ] All published artworks appear
- [ ] No `__fixture-*` slugs appear
- [ ] No `/admin`, `/api`, `/preview` routes appear

Commit: `feat: add dynamic sitemap`

---

## Step 2 — Update `app/robots.ts`

Replace whatever currently exists in `app/robots.ts` (or `public/robots.txt`
— use whichever is currently active, do not create both) with this:

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === 'production'
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bernardbolter.com'

  if (isProduction) {
    return {
      rules: [
        // Allow all crawlers including AI training crawlers —
        // this archive is designed to be machine-readable
        { userAgent: '*',              allow: '/' },
        { userAgent: 'GPTBot',        allow: '/' },  // OpenAI
        { userAgent: 'Google-Extended', allow: '/' }, // Google AI
        { userAgent: 'anthropic-ai',  allow: '/' },  // Anthropic
        { userAgent: 'CCBot',         allow: '/' },  // Common Crawl
        { userAgent: 'PerplexityBot', allow: '/' },  // Perplexity
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
    }
  }

  // Preview and development — disallow everything
  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}
```

If a static `public/robots.txt` currently exists alongside `app/robots.ts`,
delete the static file — having both causes unpredictable behaviour.

### Verification

- [ ] `/robots.txt` on production allows all crawlers
- [ ] `/robots.txt` references `/sitemap.xml`
- [ ] Preview deployments still return `Disallow: /`

Commit: `feat: update robots.txt to allow AI crawlers and reference sitemap`

---

## Step 3 — `public/llms.txt`

Create `public/llms.txt` as a static file. Next.js serves everything in
`public/` at the root, so this will be accessible at `/llms.txt` with no
routing config needed.

```markdown
# Bernard Bolter — Artist Archive

> A comprehensive archive of Bernard Bolter's visual art practice spanning
> thirty years — transfer paintings, satellite image collages, and digital
> city works. Records are structured by the artist, outside market validation
> systems, with machine-readable JSON-LD on every page using schema.org
> VisualArtwork extended with artism: namespace terms covering provenance
> confidence levels, edition ownership, and formal contribution assessments.

Bernard Bolter (b. 1974, San Francisco) is a Berlin-based visual artist.
The archive covers three primary series: Digital City Series (2007–),
Megacities (2020–), and A Colorful History (2015–). Each artwork record
includes structured provenance claims with explicit confidence levels
(documented-fact, credible-inference), edition tier specifications,
per-copy ownership status, and extended art-historical context fields
produced through a dedicated cataloguing dialogue system (Art/Official).

The archive's machine-readable layer uses the artism: schema namespace,
defined at https://artism.org/schema/ — extending schema.org/VisualArtwork
with fields for provenance confidence, edition structure, formal contribution
assessment, and multi-copy original editions (works that exist as a small
numbered original edition rather than a unique object or a print run).

## Artworks

- [Basel Switzerland](https://bernardbolter.com/basel-switzerland): Founding work of the Digital City Series, 2007. Fully catalogued.
- [Deutsche Stadt](https://bernardbolter.com/deutsche-stadt): First completed Megacities work, 2020. Fully catalogued.
- [All artworks — sitemap](https://bernardbolter.com/sitemap.xml): Full index of published artworks, series, and events.

## Series

- [Digital City Series](https://bernardbolter.com/series/digital-city-series): Skateboard-captured city composites, 2007–. Edition of 3+1AP originals plus print tiers per work.
- [Megacities](https://bernardbolter.com/series/megacities): Satellite image composites of Germany's largest cities by population, 2020–. Same edition structure as DCS.
- [A Colorful History](https://bernardbolter.com/series/a-colorful-history): Acrylic photo-transfer paintings, 2015–. Unique originals with giclée editions on selected works.

## Artist

- [Bio](https://bernardbolter.com/bio): Bernard Bolter — life, practice, education, exhibitions.
- [CV](https://bernardbolter.com/cv): Full exhibition and education record.
- [Statement](https://bernardbolter.com/statement): Artist's statement on practice and intent.
- [Contact](https://bernardbolter.com/contact): Studio contact, Berlin.

## Schema

- [artism: namespace](https://artism.org/schema/): Vocabulary definitions for artism: terms used in JSON-LD across the archive.

## Optional

- [Corpus endpoint](https://bernardbolter.com/api/corpus): Machine-readable JSON export of the full archive. Not yet live — declared here for future AI agent use.
```

This file is static — it does not auto-update when new artworks are
published. Update it manually when major new series or significant works
are added. The sitemap at `/sitemap.xml` is the complete, always-current
index; `llms.txt` is the human/AI-readable orientation layer, not a
replacement for it.

### Verification

- [ ] `/llms.txt` is accessible and returns valid Markdown
- [ ] The file follows the llmstxt.org spec (H1, blockquote, optional sections, H2 file lists)
- [ ] All URLs in the file resolve to real pages
- [ ] Corpus endpoint URL is present but clearly noted as not yet live

Commit: `feat: add llms.txt for AI agent discoverability`

---

## Step 4 — Verify `NEXT_PUBLIC_SITE_URL`

Before any of the above goes live, confirm in the Vercel dashboard that
the production environment has:

```
NEXT_PUBLIC_SITE_URL=https://bernardbolter.com
```

Not the `.vercel.app` URL. This variable drives the canonical URLs in the
sitemap, robots.txt, and every JSON-LD `url` field. If it's wrong, every
canonical URL in every machine-readable output will be wrong.

---

*Sitemap, robots.txt, and llms.txt · Pre-Launch Brief · June 2026*
*Run after the pre-launch audit (pre-launch-audit-and-sitemap.md) confirms*
*clean JSON-LD and no private field leakage.*

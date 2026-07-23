# Discovery audit — 2026-07-23

Source: Builds 1–3 implemented in repo. Raw samples below mix **live production** (where already deployed) and **post-change generators / SSR** (where not yet deployed). See §8 Deviations.

---

## 1. Sitemap

Source: live `https://bernardbolter.com/sitemap.xml`

First 15 lines:

```
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://bernardbolter.com</loc>
<changefreq>weekly</changefreq>
<priority>1</priority>
</url>
<url>
<loc>https://bernardbolter.com/bio</loc>
<changefreq>monthly</changefreq>
<priority>0.8</priority>
</url>
<url>
<loc>https://bernardbolter.com/cv</loc>
<changefreq>monthly</changefreq>
```

**Total URL count:** `237`

---

## 2. Artwork page `<head>`

**Not available from live production yet** — Builds 2–3 (alternate link + `artism:recordUrl`) are not deployed. Local `next dev` could not render artwork pages (Postgres connection timeout).

Intended alternate link emitted by Next.js Metadata (`alternates.types['application/ld+json']`) after deploy:

```html
<link rel="alternate" type="application/ld+json" href="https://bernardbolter.com/api/corpus/basel-switzerland"/>
```

See §7 for the JSON-LD body including `artism:recordUrl` from `buildArtworkJsonLd` (actual function output).

---

## 3. Homepage `<head>` + visible link

**Full raw `<head>`:** not capturable from live (not deployed) or local (DB timeout / homepage curl status `000`).

Visible server-rendered link — actual `renderToStaticMarkup(CorpusDiscoveryLink)` output:

```html
<p class="corpus-discovery-link"><a href="/api/corpus/index">Machine-readable archive index</a></p>
```

Intended homepage alternate link after deploy:

```html
<link rel="alternate" type="application/ld+json" href="https://bernardbolter.com/api/corpus/index"/>
```

Homepage JSON-LD corpus endpoint — actual `buildHomeJsonLd` output fragment:

```json
"artism:corpusEndpoint": "https://bernardbolter.com/api/corpus/index"
```

---

## 4. `robots.txt`

**App-generated production text** (`robotsConfigToText(getRobotsConfig())` with `NODE_ENV=production`, `VERCEL_ENV=production`):

```
# AI crawlers: preferred machine-readable entry point is
# https://bernardbolter.com/api/corpus/index

User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: CCBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://bernardbolter.com/sitemap.xml
```

**Currently live** `https://bernardbolter.com/robots.txt` (pre-deploy / Cloudflare-managed; see §8):

```
# As a condition of accessing this website, you agree to abide by the following
# content signals:

# (a)  If a Content-Signal = yes, you may collect content for the corresponding
#      use.
# (b)  If a Content-Signal = no, you may not collect content for the
#      corresponding use.
# (c)  If the website operator does not include a Content-Signal for a
#      corresponding use, the website operator neither grants nor restricts
#      permission via Content-Signal with respect to the corresponding use.

# The content signals and their meanings are:

# search:   building a search index and providing search results (e.g., returning
#           hyperlinks and short excerpts from your website's contents). Search does not
#           include providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models (e.g., retrieval
#           augmented generation, grounding, or other real-time taking of content for
#           generative AI search answers).
# ai-train: training or fine-tuning AI models.
# use:      how AI systems may consume the content (immediate, reference, or full).

# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT
# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.

# BEGIN Cloudflare Managed content

User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CloudflareBrowserRenderingCrawler
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: meta-externalagent
Disallow: /

# END Cloudflare Managed Content

User-agent: *
Disallow: /
```

---

## 5. `llms.txt`

Full file contents from `public/llms.txt`:

```
# Bernard Bolter — Artist Archive

Bernard Bolter's visual art archive: transfer paintings, satellite image collages, and digital city works, with structured provenance and edition records.

Machine-readable archive index: https://bernardbolter.com/api/corpus/index

This data is offered openly for AI reasoning; attribution appreciated.

---

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

- [Corpus index](https://bernardbolter.com/api/corpus/index): Preferred machine-readable entry point — lightweight slug/title/gist index of the full published archive. Filter with `?series=[slug]`, year range, or reasoning status.
```

---

## 6. `/api/corpus/index` response headers

Source: live `curl -I https://bernardbolter.com/api/corpus/index`

```
HTTP/2 200
content-type: application/json
cache-control: public, max-age=3600, stale-while-revalidate=86400
```

---

## 7. Artwork JSON-LD with `artism:recordUrl`

Actual output of `buildArtworkJsonLd` for Basel Switzerland (minimal published record):

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  },
  "@type": "VisualArtwork",
  "@id": "https://bernardbolter.com/basel-switzerland",
  "name": "Basel Switzerland",
  "url": "https://bernardbolter.com/basel-switzerland",
  "dateCreated": "2007",
  "creator": {
    "@id": "https://bernardbolter.com/bio#person"
  },
  "artMedium": "Photo collage",
  "artism:recordUrl": "https://bernardbolter.com/api/corpus/basel-switzerland"
}
```

---

## 8. Deviations from spec

1. **Audit timing:** Builds 2–3 are implemented in the repo but **not yet deployed** to bernardbolter.com. Full raw view-source `<head>` samples from live artwork/homepage pages therefore could not be pasted. Local Postgres was unreachable (connection timeout), so local SSR of those pages also failed.
2. **`/api/corpus/[slug]`:** Did not exist; created in this pass so alternate links and `artism:recordUrl` resolve (404 on live until deploy).
3. **Index `recordUrl`:** Changed from human HTML `/{slug}/record` to machine ` /api/corpus/{slug}` to match the discovery brief / tier-1 verification expectation. Human `/[slug]/record` pages remain.
4. **`robots.txt` live conflict:** Production currently appends Cloudflare-managed rules that **Disallow** `ClaudeBot`, `GPTBot`, `Google-Extended`, `CCBot`, etc. Separately, the app previously gated allow-rules on `VERCEL_ENV === 'production'` only; self-hosted production had no `VERCEL_ENV`, so the app emitted `User-agent: * / Disallow: /` after Cloudflare’s block. Fixed to also treat `NODE_ENV === 'production'` without Vercel as production. Cloudflare managed Disallows remain outside this repo.
5. **`llms.txt`:** Kept the existing longer archive guide below the three required lead lines (purpose, index URL, attribution) rather than deleting the rest.
6. **Artwork `changeFrequency`:** Set to `weekly` (brief suggested weekly for artworks). Sitemap pagination now pages at 100 docs instead of a hard `limit: 1000`.

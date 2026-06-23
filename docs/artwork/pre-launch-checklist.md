# Pre-Launch Checklist & Post-Launch Plan
## bernardbolter.com · June 2026

---

## Part 1 — Pre-launch: must be done before going live

### 1.1 Technical / infrastructure

- [ ] **Domain cutover**: point `bernardbolter.com` to the new Vercel project (remove the domain from the WordPress project, add it to the Next.js project in Vercel settings, update DNS records at your registrar)
- [ ] **Environment variables**: confirm all production env vars are set on the Vercel production environment — `PAYLOAD_SECRET`, `DATABASE_URI` (Neon production connection string), `S3_BUCKET` / `CLOUDFLARE_R2_*` (media storage), `NEXT_PUBLIC_SITE_URL` set to `https://bernardbolter.com` (not the `.vercel.app` URL)
- [ ] **`robots.txt`**: the temporary open version from earlier needs to be updated to the proper production/preview-conditional version — allow all on production domain, disallow on `.vercel.app` preview URLs
- [ ] **Sitemap**: confirm `/sitemap.xml` exists and is being generated — needed for Google Search Console and referenced in the robots.txt spec. If not yet built, either generate it or add it to the immediate post-launch list
- [ ] **OG images**: check that `og:image` meta tags are generating correctly for artwork pages, bio, CV, statement — these are what show up when links are shared on social or in messaging apps
- [ ] **Google Search Console**: verify domain ownership once DNS is pointed, submit the sitemap
- [ ] **Payload admin access**: confirm admin is accessible at `bernardbolter.com/admin` on production, with correct auth

### 1.2 Content — the "Live Switzerland" test

Before going live on the real domain, check these on at least Basel Switzerland and one other artwork:

- [ ] `provenanceConfidenceLayer` claims are entered and rendering with dot markers
- [ ] `hasEditions` is set to `'limited'` (not the default `'none'`) on every DCS/Megacities artwork
- [ ] `SeriesEditionTiers` records for Digital City Series have real `widthCm`/`heightCm`/`substrate`/`printTechnique` values (not empty — this is what generates the spec line in the accordion header)
- [ ] The "Original edition" / "Monumental" tier has `isOriginalTier` checked
- [ ] `catalogueNumber` is populated on every published artwork (drives the record meta footer and JSON-LD identifier)
- [ ] `altTitle` is populated where relevant (e.g. "Basel, Schweiz" on Basel Switzerland)
- [ ] `locationCreated.city` is populated where relevant (drives "Made in" row in object record)
- [ ] `currentLocation` is set on artworks where the original's location is known

### 1.3 Content — static pages

- [ ] **Bio page**: confirm `bioPhotos[]` array is populated, typo fixed ("20167" → "2016"), closing paragraph resolved, series links working via `getSeriesLinkHref()`
- [ ] **CV page**: confirm all exhibitions are entered as Events with correct `cvSection`, `hasPage` set correctly on those with their own pages, `ti-arrow-up-right` icon showing on linked entries
- [ ] **Statement page**: confirm all four hardcoded field segments are populated (`statementOpening`, `statementSceneImages`, `statementPullQuote`, `statementClosingBody`), `statementFull` set as canonical JSON-LD text
- [ ] **Contact page**: WhatsApp number, availability status, studio photo, social channels all populated; Formcarry form ID is the production one, not a test ID; Mapbox static map image generated for the studio address
- [ ] **"Lives and works Berlin and Berlin" bug**: confirm this is fixed — the bio line should read the two separate work cities, not the same city twice

### 1.4 JSON-LD audit

Before going live, validate the JSON-LD on at least three pages with different record states:

- [ ] A fully-catalogued artwork (Basel Switzerland) — validate at `https://validator.schema.org` and Google's Rich Results Test
- [ ] A stub artwork (Stockholm) — confirm it outputs correctly with sparse data and no missing-field errors
- [ ] The Bio page — confirm `Person` entity has ULAN/Wikidata identifiers if those are set, no empty identifier arrays
- [ ] The homepage — confirm `WebSite`/`CollectionPage` shape including `artism:corpusEndpoint`
- [ ] The new `artism:editionTierSpec`, `artism:provenanceClaims`, `artism:originalEditionSize` fields are appearing in artwork page JSON-LD once `artwork-page-jsonld-update.md` is implemented

### 1.5 Final visual check

- [ ] **`N` badge duplicate**: confirm `ReasoningStatusBadge` no longer renders in Layer3 — should appear only in the record meta footer, not in both places (still visible in Basel screenshot mid-prose)
- [ ] **Similar works section on Basel**: confirm the oil painting image isn't appearing as a CLIP-similar work — if it is, check whether the oil painting has a CLIP embedding and whether that's correct behaviour
- [ ] **Mobile**: check the artwork page two-column layout collapses correctly to the specced mobile stack order (SeriesCard → Layer1 → Status & Provenance + Editions → Layer3 prose → Exhibition history)
- [ ] **Page titles and meta descriptions**: confirm `<title>` tags are correct on artwork pages, static pages, and series pages — these are what appear in browser tabs and search results

---

## Part 2 — At launch

- [ ] **Switch the domain**: the actual cutover — remove `bernardbolter.com` from the WordPress Vercel project, add it to the Next.js project. DNS propagation may take a few minutes to a few hours.
- [ ] **Redirect old WordPress URLs**: any old WordPress URLs that were indexed (e.g. `/artwork/[slug]` or `/wp-content/...`) should 301-redirect to the new equivalents where possible. Worth checking Google Search Console after a few days to see if any old URLs are generating 404s.
- [ ] **Announce to Artsy/Instagram**: update the link in bio and any Artsy profile to point to the new site
- [ ] **Ping Google**: in Search Console, request indexing of the homepage and sitemap

---

## Part 3 — Post-launch: immediate (first two weeks)

### Cataloguing priority order

The site is live but most DCS and Megacities artworks are stubs. The most impactful cataloguing work, in order:

1. **DCS artworks** — these have the richest schema (DCS tab, edition tiers, city context) and are the most distinctive works. Enter at minimum: `contribution`, `aboutTheWork`, `intent`, `provenanceConfidenceLayer` (even just the creation claim), and `hasEditions: limited` on each
2. **Megacities artworks** — same priority as DCS once DCS is done
3. **A Colorful History** — the deepest prose content, but the schema is simpler (no DCS/Megacities tab). Gates of Perception III is already well-catalogued; expand to the rest of the sub-series first (Mediums of Perception, then Gates)

### Store coming online

When Vendure integration happens — per the architecture decisions in `print-data-architecture-reference-v2.md`:
- One Vendure Product per tier (shared series-wide, `vendureProductId` on `SeriesEditionTiers`)
- One Vendure Variant per artwork-tier combination (`vendureVariantId` on the artwork's tier entry)
- Set price once at the Product level in Vendure; it applies everywhere
- When a sale completes, Vendure decrements variant stock; the artist manually reviews and confirms the buyer's claim in Payload's `copies[]` — this is never automated

### Wikidata entry

A draft Wikidata entity for Bernard Bolter was composed earlier (birth year 1974, San Francisco, Gerrit Rietveld Academie, HKU Utrecht). Once submitted and approved, update `artist.wikidataUri` in the Payload artist singleton — this propagates into every artwork's JSON-LD creator block and the bio page's Person entity automatically, since both read from the Artist singleton.

### ULAN submission

Submit to Getty via `ULAN@getty.edu` once the Wikidata entry exists (having a Wikidata entry strengthens the submission). Update `artist.ulanUri` once assigned.

---

## Part 4 — Post-launch: medium term (one to three months)

### The corpus endpoint

The homepage JSON-LD already declares `artism:corpusEndpoint: "https://bernardbolter.com/api/corpus"`. Build the actual endpoint — a machine-readable JSON export of the full archive, structured so an AI system can load and reason over it. This is the infrastructure that makes the project's broader thesis testable: can an AI system, given the corpus, reason honestly about this body of work?

This is also what makes the "point the URL to Claude in this chat" test you described at the end actually powerful — the more complete the corpus endpoint, the more richly the conversation can reason about the whole archive rather than just individual pages.

### Tags completion

Per `tags-future-roadmap.md`: authority URI completion passes (AAT, Wikidata), cross-reuse enforcement (no tag applied to only one artwork), computed first/last appearance per tag, co-occurrence analysis. Worth one dedicated pass once 30+ artworks are catalogued.

### Art/Official enrichment pipeline

The two-phase enrichment (Haiku for factual lookup, Sonnet for the four-question locked dialogue) for events. Worth starting once the Events collection has real published entries rather than stubs.

### Series sites

When DCS and Megacities series sites exist, update `getSeriesLinkHref()` to return the external URL — a one-file change, by design.

---

## Part 5 — The conversation test

You mentioned that the real test is when you can point the URL here in chat and discuss the whole archive. That's genuinely achievable soon, and it's worth thinking about what makes that conversation more or less useful:

**What makes it rich:** fully-catalogued artworks with intent, process, and series context filled in; the corpus endpoint built so Claude can see the full picture at once rather than one page at a time; Wikidata/ULAN identifiers set so the artist entity connects to the wider knowledge graph.

**What makes it work even with stubs:** the JSON-LD is already generating correctly on every published artwork regardless of how much prose is filled in — a stub with just a title, year, medium, and catalogue number is already machine-readable. The conversation can happen with partial data; it'll just get richer as more is filled in.

**What to ask about:** once the URL is live and accessible, a Claude session with web search enabled can fetch individual artwork pages, read their JSON-LD directly, and reason about the work — its place in the series, its provenance, its relationship to other works via CLIP similarity. That's the corpus becoming visible and discussable, which was always the point of building it this way.

---

*Pre-Launch Checklist & Post-Launch Plan · bernardbolter.com · June 2026*

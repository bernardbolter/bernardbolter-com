# Corpus API Endpoint — Implementation Brief
## bernardbolter.com · `/api/corpus` · June 2026

---

## Purpose

A single endpoint that returns the complete machine-readable archive in one
request. Designed for AI systems that need to reason across the whole body
of work rather than fetching individual artwork pages.

Declared in the homepage JSON-LD as `artism:corpusEndpoint` and in
`llms.txt` — this is the endpoint that makes the archive genuinely
traversable by an AI agent in one pass.

---

## Route

`GET /api/corpus`

Returns JSON. No authentication required — this is public data, the same
information available by reading every artwork page's JSON-LD individually.
No private fields (owner names, prices, vendure IDs, evidenceBasis) should
appear here any more than they appear in individual page JSON-LD.

Optional query parameters:
- `?series=[slug]` — filter to one series
- `?format=jsonld` — default, returns the structured format below
- `?format=index` — lightweight index only (see below), for quick lookups

---

## Response shape

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  },
  "@type": "DataFeed",
  "name": "Bernard Bolter — Artist Archive Corpus",
  "url": "https://bernardbolter.com/api/corpus",
  "dateModified": "[ISO timestamp of most recently updated artwork]",
  "artism:corpusVersion": "1.0",
  "artism:totalArtworks": 215,
  "artism:totalPublished": 198,

  "author": {
    "@type": "Person",
    "name": "Bernard Bolter",
    "@id": "https://bernardbolter.com/bio#person",
    "identifier": [
      { "@type": "PropertyValue", "propertyID": "ULAN", "value": "[artist.ulanUri]" },
      { "@type": "PropertyValue", "propertyID": "Wikidata", "value": "[artist.wikidataUri]" }
    ]
  },

  "about": [
    {
      "@type": "Collection",
      "name": "Digital City Series",
      "url": "https://bernardbolter.com/series/digital-city-series",
      "startDate": "2007",
      "description": "[series.description plain text]"
    }
    // ... other series
  ],

  "dataFeedElement": [
    // One entry per published artwork — see "Per-artwork entry" below
  ]
}
```

### Per-artwork entry

Each entry in `dataFeedElement` is the same JSON-LD object already generated
by `generateArtworkJsonLd.ts` for the individual artwork page — reuse that
function directly, do not rewrite the logic here. The corpus endpoint is an
aggregator, not a separate data pipeline.

```json
{
  "@type": "VisualArtwork",
  "name": "Basel Switzerland",
  "identifier": { "@type": "PropertyValue", "propertyID": "CatalogueNumber", "value": "BB-DCS-2007-002" },
  "url": "https://bernardbolter.com/basel-switzerland",
  "dateCreated": "2007",
  "artMedium": "Photo collage",
  "width": { "@type": "QuantitativeValue", "value": 121.9, "unitCode": "CMT" },
  "height": { "@type": "QuantitativeValue", "value": 121.9, "unitCode": "CMT" },
  "isPartOf": { "@type": "Collection", "name": "Digital City Series", "url": "https://bernardbolter.com/series/digital-city-series" },
  "artism:editionTierSpec": [ /* ... */ ],
  "artism:editionClaimSummary": [ /* ... */ ],
  "artism:provenanceConfidenceLevel": "fully-documented",
  "artism:provenanceClaims": [ /* ... */ ],
  "artism:originalEditionSize": 3,
  "artism:formalContributionAssessment": "Basel Switzerland establishes the formal and conceptual DNA...",
  "artism:intent": "The square format was chosen because...",
  "artism:seriesContext": "Basel Switzerland is the founding work...",
  "additionalProperty": [ /* all other artism: fields */ ]
}
```

---

## Lightweight index format (`?format=index`)

For quick lookups when full prose isn't needed — one line per artwork:

```json
{
  "@type": "DataFeed",
  "name": "Bernard Bolter — Artist Archive Index",
  "dataFeedElement": [
    {
      "slug": "basel-switzerland",
      "title": "Basel Switzerland",
      "catalogueNumber": "BB-DCS-2007-002",
      "year": 2007,
      "series": "digital-city-series",
      "seriesName": "Digital City Series",
      "medium": "Photo collage",
      "reasoningStatus": "complete",
      "hasEditions": "limited",
      "url": "https://bernardbolter.com/basel-switzerland"
    }
    // ... all other artworks
  ]
}
```

This is what you'd use to get a quick picture of the whole archive —
which artworks exist, which series they belong to, which are fully
catalogued vs stubs. Fast to generate, small enough to fit in any
context window regardless of archive size.

---

## Implementation

```ts
// app/api/corpus/route.ts
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateArtworkJsonLd } from '@/utilities/generateArtworkJsonLd'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // never cache — always fresh

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const seriesFilter = searchParams.get('series')
  const format = searchParams.get('format') ?? 'jsonld'

  const payload = await getPayload({ config })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bernardbolter.com'

  const where: Record<string, unknown> = {
    and: [
      { status: { equals: 'published' } },
      { slug: { not_like: '__fixture%' } },
    ],
  }

  if (seriesFilter) {
    (where.and as unknown[]).push({ 'series.slug': { equals: seriesFilter } })
  }

  const artworks = await payload.find({
    collection: 'artworks',
    where,
    limit: 1000,
    depth: 3, // enough to populate series, edition tiers, events
    overrideAccess: true,
  })

  const series = await payload.find({
    collection: 'series',
    where: { status: { equals: 'published' } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  const artist = await payload.findGlobal({
    slug: 'artist',
    overrideAccess: true,
  })

  if (format === 'index') {
    return NextResponse.json({
      '@context': { '@vocab': 'https://schema.org/', 'artism': 'https://artism.org/schema/' },
      '@type': 'DataFeed',
      'name': 'Bernard Bolter — Artist Archive Index',
      'url': `${baseUrl}/api/corpus?format=index`,
      'artism:totalArtworks': artworks.totalDocs,
      'dataFeedElement': artworks.docs.map(artwork => ({
        slug: artwork.slug,
        title: artwork.title,
        catalogueNumber: artwork.catalogueNumber,
        year: artwork.yearCreated,
        series: typeof artwork.series === 'object' ? artwork.series?.slug : artwork.series,
        seriesName: typeof artwork.series === 'object' ? artwork.series?.name : null,
        medium: artwork.medium,
        reasoningStatus: artwork.reasoningStatus,
        hasEditions: artwork.hasEditions,
        url: `${baseUrl}/${artwork.slug}`,
      })),
    }, {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Full JSON-LD format
  const dataFeedElements = artworks.docs.map(artwork =>
    generateArtworkJsonLd(artwork, artist, baseUrl)
  )

  const mostRecent = artworks.docs.reduce((latest, a) =>
    new Date(a.updatedAt) > new Date(latest) ? a.updatedAt : latest,
    artworks.docs[0]?.updatedAt ?? new Date().toISOString()
  )

  return NextResponse.json({
    '@context': { '@vocab': 'https://schema.org/', 'artism': 'https://artism.org/schema/' },
    '@type': 'DataFeed',
    'name': 'Bernard Bolter — Artist Archive Corpus',
    'url': `${baseUrl}/api/corpus`,
    'dateModified': mostRecent,
    'artism:corpusVersion': '1.0',
    'artism:totalArtworks': artworks.totalDocs,
    'author': {
      '@type': 'Person',
      'name': 'Bernard Bolter',
      '@id': `${baseUrl}/bio#person`,
      'identifier': [
        artist.ulanUri ? { '@type': 'PropertyValue', 'propertyID': 'ULAN', 'value': artist.ulanUri } : null,
        artist.wikidataUri ? { '@type': 'PropertyValue', 'propertyID': 'Wikidata', 'value': artist.wikidataUri } : null,
      ].filter(Boolean),
    },
    'about': series.docs.map(s => ({
      '@type': 'Collection',
      'name': s.name,
      'url': `${baseUrl}/series/${s.slug}`,
      'startDate': s.yearStart,
      ...(s.yearEnd ? { 'endDate': s.yearEnd } : {}),
    })),
    'dataFeedElement': dataFeedElements,
  }, {
    headers: {
      'Content-Type': 'application/json',
      // Allow AI crawlers to cache for up to 1 hour
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
```

### Important implementation note

`generateArtworkJsonLd` is called once per artwork — confirm this function
already handles missing/empty optional fields gracefully (returns `undefined`
or omits the key) rather than emitting `null` values or empty arrays into
the JSON-LD output. If it doesn't, fix that in `generateArtworkJsonLd.ts`
directly rather than adding guards here.

---

## Caching strategy

`force-dynamic` ensures Vercel always generates a fresh response —
important since artworks are regularly published and updated.
The `Cache-Control` header allows CDN/browser caching for 1 hour with
stale-while-revalidate for up to 24 hours, which is a reasonable tradeoff
between freshness and load time for a 200+ artwork corpus response.

If the full corpus response becomes slow (unlikely until the archive is
very large, but worth knowing): add an `?updated_after=[ISO date]`
parameter to support incremental fetches, or add Vercel's on-demand
revalidation triggered by Payload's `afterChange` hooks.

---

## Do NOT

- Do not include `vendureProductId`, `vendureVariantId`, `editionsRemaining`,
  `askingPrice`, `ownerPrivate`, `evidenceBasis`, `notes` (from `copies[]`),
  or any other private field — same rules as individual page JSON-LD
- Do not include draft artworks or `__fixture-*` slugs
- Do not build a separate data pipeline — reuse `generateArtworkJsonLd`
  directly so the corpus stays in sync with individual page output
  automatically

---

## Verification

- [ ] `GET /api/corpus` returns valid JSON
- [ ] `GET /api/corpus?format=index` returns the lightweight index
- [ ] `GET /api/corpus?series=digital-city-series` returns only DCS artworks
- [ ] No private fields appear in either format
- [ ] No `__fixture-*` slugs appear
- [ ] `artism:corpusEndpoint` in the homepage JSON-LD resolves to a real,
  working URL once this is deployed
- [ ] `llms.txt` corpus endpoint note updated to remove "Not yet live"

Commit: `feat: add /api/corpus endpoint for AI agent traversal`

---

*Corpus API Endpoint · June 2026*
*Declared in: homepage JSON-LD (artism:corpusEndpoint), llms.txt*
*Depends on: generateArtworkJsonLd.ts, artwork-page-jsonld-update.md*

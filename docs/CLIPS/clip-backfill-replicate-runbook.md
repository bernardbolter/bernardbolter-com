# CLIP Embedding Backfill — Local Script & Runbook
*One-time launch backfill via Replicate · ~215 artworks*

---

## ⚠️ Required first step: fix the column type

Your collection config (`Artworks.ts`) and the live Neon column both currently say `vector(1536)`. **This is wrong and must be corrected before running the script.**

Standard CLIP ViT-L/14 (the model this script uses) outputs a **768-dimension** embedding, not 1536. Casting a 768-value array into a `vector(1536)` column will fail (dimension mismatch) or, if Postgres is lenient about it in some configuration, silently produce a corrupted/padded vector that will break similarity search later. Either way, do not skip this step.

### 1. Migrate the column

Run this directly in your Neon SQL console (or via `psql`) **before** running the backfill script:

```sql
-- Confirm current state first
SELECT column_name, udt_name 
FROM information_schema.columns 
WHERE table_name = 'artworks' 
AND column_name = 'clip_embedding';
-- Expect: jsonb, all rows NULL (per your live check)

-- Migrate to the correct dimension
ALTER TABLE artworks 
  ALTER COLUMN clip_embedding TYPE vector(768) 
  USING clip_embedding::text::vector(768);
```

Since every row is currently `NULL`, this is a safe, instant migration — there's no real data being cast, just a type change on an empty column.

### 2. Fix the collection config to match

In `Artworks.ts`, around line 1008–1016, update:

```ts
custom: { dbType: 'vector(1536)' },
description: 'CLIP embedding stored as vector(1536); use SQL/API for similarity, not this cell.',
```

to:

```ts
custom: { dbType: 'vector(768)' },
description: 'CLIP embedding stored as vector(768) — CLIP ViT-L/14 output. Use SQL/API for similarity, not this cell.',
```

Do this even though Payload's schema push isn't what created the column originally (per your note, it's currently `jsonb` live vs. `vector` in config) — the config should describe reality so the next person reading this file isn't misled the same way this session almost was.

---

## 3. Environment setup

Add to your local `.env` (do not commit this):

```
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Get this from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens). Add at least $5 in billing credit at [replicate.com/account/billing](https://replicate.com/account/billing) — per-call cost for ~215 small CLIP calls is well under $1, but a zero balance will hard-stop the run partway through.

Your existing `DATABASE_URL` (Neon connection string) is reused as-is — no new credential needed there.

Install the one new dependency:

```bash
npm install replicate
```

---

## 4. The script

```typescript
// scripts/backfillClipEmbeddings.ts
//
// One-time local backfill. Run manually via:
//   npx tsx scripts/backfillClipEmbeddings.ts
//
// Safe to re-run: only processes artworks where clip_embedding IS NULL,
// so a partial/failed run can simply be re-run to pick up where it left off.

import { Pool } from 'pg'
import Replicate from 'replicate'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

// Verified live on replicate.com/openai/clip — official Replicate-maintained
// model. No version hash needed for official models; reference by name only.
// Confirmed output shape: { "embedding": [768 floats] }
const CLIP_MODEL = 'openai/clip'

const DELAY_MS = 350 // small pause between calls — avoid hammering Replicate's rate limit

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('Querying artworks needing CLIP embeddings...')

  const { rows: artworks } = await pool.query(`
    SELECT a.id, a.slug, m.url AS image_url
    FROM artworks a
    LEFT JOIN media m ON m.id = a.primary_image_id
    WHERE a._status = 'published'
      AND a.clip_embedding IS NULL
      AND m.url IS NOT NULL
    ORDER BY a.id
  `)

  console.log(`Found ${artworks.length} artworks to process.\n`)

  let succeeded = 0
  const failed: { slug: string; error: string }[] = []

  for (const [index, artwork] of artworks.entries()) {
    const progress = `[${index + 1}/${artworks.length}]`
    try {
      console.log(`${progress} ${artwork.slug} — calling Replicate...`)

      const output = await replicate.run(CLIP_MODEL, {
        input: { image: artwork.image_url },
      })

      // Verified live: output is always { embedding: [768 floats] } for
      // openai/clip. No need to guess at alternate shapes.
      const embedding = (output as any).embedding

      if (!Array.isArray(embedding) || embedding.length !== 768) {
        throw new Error(
          `Unexpected embedding shape: got ${
            Array.isArray(embedding) ? embedding.length : typeof embedding
          } values, expected 768`
        )
      }

      await pool.query(
        `UPDATE artworks SET clip_embedding = $1::vector WHERE id = $2`,
        [JSON.stringify(embedding), artwork.id]
      )

      console.log(`${progress} ${artwork.slug} — ✅ saved`)
      succeeded++
    } catch (err: any) {
      console.error(`${progress} ${artwork.slug} — ❌ FAILED: ${err.message}`)
      failed.push({ slug: artwork.slug, error: err.message })
    }

    await sleep(DELAY_MS)
  }

  console.log('\n--- Summary ---')
  console.log(`Total processed: ${artworks.length}`)
  console.log(`Succeeded: ${succeeded}`)
  console.log(`Failed: ${failed.length}`)
  if (failed.length > 0) {
    console.log('\nFailed artworks:')
    failed.forEach((f) => console.log(`  - ${f.slug}: ${f.error}`))
  }

  await pool.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
```

---

## 5. Before running on all 215 — test on one artwork first

Don't run the full batch blind. Temporarily add `LIMIT 1` to the query, run it, and manually check:

```sql
SELECT id, slug, clip_embedding 
FROM artworks 
WHERE slug = '[the one slug you just tested]';
```

Confirm:
- The value isn't null
- It looks like 768 comma-separated floats, not an error string or empty array
- No error was thrown about the `::vector` cast

**Model confirmed:** [replicate.com/openai/clip](https://replicate.com/openai/clip) — official, Replicate-maintained, no version pinning needed. Verified output shape is `{ "embedding": [768 floats] }`. The script above already reflects this; no further guessing needed here.

Once that one test row looks correct, remove `LIMIT 1` and run the full script.

---

## 6. Run it

```bash
npx tsx scripts/backfillClipEmbeddings.ts
```

Watch the output. It'll take roughly 2–4 minutes for 215 images at this pace (mostly Replicate's processing time per call, not the artificial delay). If it stops partway through (network blip, one bad image), just run the same command again — already-completed artworks are skipped automatically.

---

## 7. Verify when done

```sql
SELECT count(*) FROM artworks WHERE clip_embedding IS NOT NULL;
-- Should be close to 215 (allowing for any artworks genuinely missing an image)

SELECT count(*) FROM artworks WHERE _status = 'published' AND clip_embedding IS NULL;
-- Should be 0, or only artworks with no primaryImage at all
```

---

*This script is intentionally a one-time, manually-run local utility — not deployed, not a Payload Job, not wired into any hook. The future Hetzner-based pipeline (ongoing per-new-artwork generation, and eventually local CLIP inference rather than Replicate) is separate work, tracked separately.*

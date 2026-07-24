# Sessions as Tier 5 — Machine-Readable Access Spec
*July 24, 2026 · Read alongside `corpus-tier-system-brief.md` (Tier 5 definition), `art-official-dialogue-spec.md` Section 9/10 (Sessions access control), `corpus-api-restructure-spec.md`, `sessions-collection-and-importer-brief.md`.*

---

## Part 1 — Why, and what this does NOT change

`corpus-tier-system-brief.md` already defines Tier 5 as full session transcripts — "how was this known," not just the conclusion. What's missing is the access-control update to make it real: the current Sessions spec states plainly that the collection is "never returned in public API responses." That needs a carve-out, not a removal.

**Unchanged:**
- The public `/sessions` and `/sessions/[slug]` HTML pages stay exactly as they are — crumb only (type, date, linked works), no transcript, no field-level detail. This spec adds a machine-readable API path; it does not add a human-readable transcript page.
- `status: in-progress` sessions are never exposed anywhere outside the admin, regardless of this change — only `completed` sessions are eligible for Tier 5.

**What changes:** a defined subset of Sessions fields becomes fetchable via API, keyed to an artwork, for machine reasoning (the librarian, external AI systems, your own corpus-watchman jobs). The rest of the collection stays exactly as private as it is today.

---

## Part 2 — Field-level exposure: two labeled streams within one public response

Both streams go public at Tier 5. The split that matters isn't private-vs-public anymore — it's making sure a reader (human or machine) can never mistake one for the other. This is itself consistent with how the project already treats its own record: the confabulated-analysis incident and the Known Mediations document are both examples of the archive auditing itself in public rather than scrubbing the seams.

**Stream A — `artistRecord` (the reasoning trail itself):**

| Field | Included |
|---|---|
| `sessionId`, `sessionType`, `createdAt` / `completedAt` | Yes |
| `primaryArtwork` / `mentionedArtworks` | Yes (as slugs) |
| `messages` | Yes — the transcript |
| `firstImpression` / `secondDescription` | Yes |
| `fieldUpdateTimeline` | Yes |

**Stream B — `artism:DialogueSelfAudit` (process integrity, not artwork content):**

| Field | Included, under the labeled node |
|---|---|
| `sessionNotes`, `weakPhases`, `blindDescriptionUseful`, `formalContributionAccuracy`, `dialogueRefinementFlag`, `refinementNotes` | Yes, nested under `artism:DialogueSelfAudit`, never flattened into `artistRecord` |
| `agentDraftDescriptionShort/Long`, `agentDraftConceptualKeywords`, `agentDraftFormalContribution` | Yes, same node — pre-edit drafts, explicitly marked as superseded by the artist's confirmed version, never presented as if confirmed |
| `agentModel` (NEW field, see Part 2.1) | Yes — which model ran this session |

### 2.1 — New field required: `agentModel`

Add `agentModel` (text, e.g. `"claude-sonnet-5"`) to the Sessions schema if not already present, captured at session start from the live API route's model string. This is what makes Stream B legible as "an artifact of this specific pairing, dated, tied to a particular model" rather than a timeless judgment about the artwork or the artist. Every `artism:DialogueSelfAudit` node must carry it.

**Do NOT** flatten Stream A and B into one undifferentiated object — the node boundary is the entire point. A machine reasoning over the corpus should be able to trivially filter out or specifically target `artism:DialogueSelfAudit` without touching `artistRecord`.

---

## Part 3 — Endpoint

Extend the existing tiered corpus API rather than building a new standalone endpoint — reconcile the exact route with `corpus-api-restructure-spec.md`'s existing pattern (likely `/api/corpus/[slug]?tier=5` matching Tier 1–4's per-artwork query shape, but confirm against what's already live rather than assuming).

```
GET /api/corpus/[slug]?tier=5
```

Response shape:
```json
{
  "@type": "DataFeed",
  "artism:tier": 5,
  "artworkSlug": "venice-biennale-2007",
  "sessions": [
    {
      "sessionId": "...",
      "sessionType": "artwork-cataloguing",
      "completedAt": "...",
      "primaryArtwork": "venice-biennale-2007",
      "mentionedArtworks": ["skulptur-projekte-m-nster-2007"],
      "artistRecord": {
        "firstImpression": "...",
        "secondDescription": "...",
        "messages": [ { "role": "...", "content": "..." } ],
        "fieldUpdateTimeline": [ { "field": "...", "value": "...", "confidence": "...", "source": "...", "timestamp": "..." } ]
      },
      "artism:DialogueSelfAudit": {
        "agentModel": "claude-sonnet-5",
        "sessionNotes": "...",
        "weakPhases": ["confirmation"],
        "blindDescriptionUseful": true,
        "formalContributionAccuracy": "partial",
        "dialogueRefinementFlag": true,
        "refinementNotes": "...",
        "agentDraftDescriptionShort": "...",
        "agentDraftFormalContribution": "..."
      }
    }
  ]
}
```

`artism:DialogueSelfAudit` is a distinct, clearly-namespaced node specifically so it reads as process-integrity data about the tool and the model that ran the session — dated and pairing-specific — never as commentary on the artwork or a claim about the artist. Any future documentation or JSON-LD context definition for this type should say exactly that, in plain language, so a human encountering it in 2226 doesn't mistake a note like "agent paced toward closure prematurely" for something said about the painting.

Only `mentionedArtworks` relations pull in *other* sessions' Tier 5 data if the artwork being queried is itself the `mentionedArtworks` target of a different primary session — i.e. querying `skulptur-projekte-m-nster-2007` at tier 5 should surface the Venice Biennale 2007 session too, since it's mentioned there. Confirm this bidirectional pull is intended before building — it's implied by "via primaryArtwork/mentionedArtworks relations" in the original tier definition, but worth stating explicitly since it changes the query from a simple filter into a small join.

---

## Part 4 — Access control update (supersedes prior blanket rule)

Update `art-official-dialogue-spec.md` Section 9.3/10.3. Current text:

> "Sessions are private to the artist and admin role. Never returned in public API responses."

Replace with:

> "Sessions are private to the artist and admin role for direct collection access (read/create/update/delete via Payload admin or local API). A separate, public Tier 5 API path exists for machine-readable corpus access (see `sessions-tier5-machine-access-spec.md`), keyed by artwork slug, for `completed` sessions only. This path exposes both the artist's reasoning trail (`artistRecord`) and the dialogue system's own process-integrity notes (`artism:DialogueSelfAudit`), kept in clearly separated, distinctly-namespaced nodes so the two are never confused with one another."

---

## Part 5 — Do NOT

- Do not expose `status: in-progress` sessions via the Tier 5 endpoint under any circumstance.
- Do not flatten `artistRecord` and `artism:DialogueSelfAudit` into one undifferentiated object — the labeled-node boundary is the entire point of this design.
- Do not omit `agentModel` from any `artism:DialogueSelfAudit` node — without it, self-audit notes read as timeless judgments rather than dated, pairing-specific artifacts.
- Do not build a human-readable transcript page — the existing crumb-only `/sessions/[slug]` page is correct as-is and untouched by this spec.
- Do not let the Tier 5 endpoint bypass the existing cache-invalidation tagging scheme (`corpus-caching-spec.md`) — a new session completing should invalidate the relevant artwork's Tier 5 cache the same way a `visionAnalyses` update invalidates Tier 3/4.

---

## Part 6 — Build order

**Step 1** — Confirm exact route pattern against `corpus-api-restructure-spec.md`'s live Tier 1–4 implementation; do not assume `?tier=5` is correct without checking.
**Step 2** — Add a field-projection function that returns only Category A fields for `completed` sessions matching the queried slug via `primaryArtwork` OR `mentionedArtworks`.
**Step 3** — Wire cache invalidation: session completion triggers the same `afterChange` → Cloudflare purge pattern already driving other tiers, scoped to `artwork-${primaryArtwork}` and `artwork-${each mentionedArtwork}` tags.
**Step 4** — Update the access-control language in `art-official-dialogue-spec.md` per Part 4.
**Step 5** — Verify against the Venice Biennale 2007 / Münster 2007 pair as the first real test case, once that session record exists in Sessions (see `chat-session-import-bridge-spec.md`).

---

## Verification checklist

- [ ] `/api/corpus/venice-biennale-2007?tier=5` returns the Venice session, including the Münster mention *(live after deploy + `add-sessions-agent-model-schema.ts` + seed refresh)*
- [ ] `/api/corpus/skulptur-projekte-m-nster-2007?tier=5` also returns the Venice session (bidirectional pull via `mentionedArtworks`) *(unit-tested; live after deploy)*
- [x] `artistRecord` and `artism:DialogueSelfAudit` appear as clearly separate, distinctly-namespaced nodes, never merged
- [x] Every `artism:DialogueSelfAudit` node includes `agentModel`
- [x] An `in-progress` session never appears in any Tier 5 response
- [x] Public `/sessions/[slug]` HTML page unchanged — still crumb-only
- [x] Editing/completing a session correctly invalidates cached Tier 5 responses for the relevant artwork(s) *(sessionAfterChange wired)*

---
*Sessions Tier 5 machine-access spec · July 24, 2026*

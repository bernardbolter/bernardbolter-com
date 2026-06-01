# Small Private LLM — Capabilities & Routing Architecture
## bernardbolter.com · Hybrid AI Infrastructure
*May 2026 — new project reference document*

---

## What this document is

A design document covering two things:

1. **What a cloud-hosted small private LLM can do** in the context of this project — the tasks it handles well without needing Claude's reasoning capability
2. **How a router inside Art/Official sessions should work** — deciding in real time which tasks go to the small model and which go to Claude

This pattern is not yet implemented. This document is the design specification for building it.

---

## The core principle

Claude is expensive, slow for mechanical tasks, and overkill for a significant portion of what happens during an Art/Official session. A large fraction of session activity is structured extraction, classification, and computation — not reasoning or conversation. Routing those tasks to a small model reduces cost per session, reduces latency on non-conversational operations, and keeps Claude's attention where it actually matters: the dialogue.

The small model is not a replacement for Claude. It is the prep work and the plumbing. Claude handles meaning. The small model handles mechanics.

---

## 1. What a Small Private LLM Can Do

### 1.1 Embedding generation (text)

Generating dense vector representations of text fields for semantic search and similarity queries. Distinct from CLIP embeddings (which are image-based) — text embeddings power queries like "find works with similar conceptual keywords" or "find artworks where the intent description is semantically close to this one."

**Fields to embed:** `intent`, `artHistoricalContext`, `seriesContext`, `formalContributionAssessment`, `conceptualKeywords`, `descriptionLong`

**Model options:** `nomic-embed-text`, `mxbai-embed-large`, `text-embedding-3-small` (via OpenAI-compatible endpoint). All run efficiently in cloud inference at very low cost per call.

**Storage:** pgvector on Neon, same extension as CLIP embeddings. Separate column per embedding type.

---

### 1.2 Pre-processing before Claude sees the input

Preparing, cleaning, and structuring raw input before it enters Claude's context window. Every token Claude processes costs money — the small model trims waste.

**Tasks:**
- Strip and normalise dimension strings (`"60 x 80"`, `"60×80cm"`, `"60 by 80"` → `{ widthCm: 60, heightCm: 80 }`)
- Parse date references (`"made in late 2019"`, `"2018–19"` → `{ yearCreated: 2018, yearCompleted: 2019 }`)
- Normalise medium descriptions to canonical forms before tag matching (`"oil and cold wax"` → candidate match against medium taxonomy)
- Detect language of artist input (for multilingual sessions) and route accordingly
- Summarise long prior conversation turns into a compressed context block before passing history to Claude (preventing context window bloat over long sessions)

---

### 1.3 Classification and structured extraction

Assigning values to well-defined select fields from free text. These are pattern-matching tasks — not reasoning tasks. The small model handles them faster and cheaper than Claude.

**Fields the small model can classify:**

| Field | Task | Example |
|---|---|---|
| `sizeTier` | Derive from dimensions | `{ widthCm: 180, heightCm: 200 }` → `xl` |
| `orientation` | Derive from dimensions | `180 × 200` → `portrait` |
| `support` | Extract from medium string | `"oil on linen"` → `linen` |
| `medium` | Normalise to select value | `"acrylic photo transfer"` → `acrylic-photo-transfer` |
| `condition` | Extract from artist description | `"minor surface dirt"` → `good` |
| `framing` | Extract from artist statement | `"unframed, stretched"` → `unframed` |
| `acquisitionChannel` | Extract from context | `"bought directly from the studio"` → `direct-from-artist` |
| `sessionType` validity | Confirm incoming session type matches expected values | Route mismatch before Claude session opens |

---

### 1.4 Tag suggestion from structured data

Generating candidate tag arrays from medium, series, and image analysis data — for Claude to present to the artist as a pre-assembled draft.

**Inputs:** confirmed medium, series name, image analysis output (compositional notes, colour data), any existing tags on related works in the same series.

**Output:** candidate arrays for `movementTags`, `styleTags`, `subjectTags`, `genreTags`, `periodTags` — ranked by confidence. Claude reviews the list, selects from it, and presents to the artist. Claude does not regenerate from scratch.

This is not the same as Claude suggesting art historical resonances. That requires genuine reasoning over the knowledge base. This is pattern matching against the taxonomy from structured inputs.

---

### 1.5 Authority URI lookup and enrichment

Matching confirmed tag labels to Getty AAT, ULAN, TGN, Iconclass, and LCSH URIs. This is a lookup task — the small model queries a local vocabulary cache or an API and returns the URI if it finds a match.

**Tasks:**
- `medium` label → AAT URI (`oil paint` → `http://vocab.getty.edu/aat/300015012`)
- `movementTag` label → AAT URI (`Abstract Expressionism` → `http://vocab.getty.edu/aat/300108615`)
- Artist name → ULAN URI
- City/country → TGN URI
- Subject tag → Iconclass notation

This populates the authority URI fields on the Tags collection without Claude needing to reason about vocabularies it knows but shouldn't be tasked with looking up mechanically.

---

### 1.6 Bulk enrichment — back-catalogue operations

Running classification, tagging, and embedding generation across the full existing artwork corpus in batch. These are the operations that populate dormant fields on records created before Art/Official existed, or that refresh embeddings after a model upgrade.

**Typical enrichment run:**
1. Query all Artworks where `clipEmbedding` is null → generate embeddings in parallel
2. Query all Artworks where `sizeTier` is null → derive from dimensions
3. Query all Artworks where `movementTags` is empty → generate candidate tags from medium + series
4. Query all Tags where `aatUri` is null → attempt URI lookup
5. Write results back with `confidence: inferred`, `recordOrigin: enrichment-agent`

All of this runs without Claude. Cost is a fraction of a cent per record.

---

### 1.7 Session quality monitoring

Post-session analysis on completed sessions to flag dialogue refinement candidates. The small model reads the `fieldUpdateTimeline` and `messages` fields on the Sessions collection and produces a structured quality report.

**Output fields it populates:**
- `weakPhases` — which session phases had thin output (few field confirmations, short artist turns)
- `dialogueRefinementFlag` — boolean, set true if quality thresholds are not met
- `blindDescriptionUseful` — was the pre-upload phase material referenced in later intent fields
- `formalContributionAccuracy` — comparison of agent draft vs artist-confirmed value

These quality signals feed the dialogue refinement loop without requiring Claude to read every session transcript.

---

## 2. The Router — Art/Official Session Architecture

### 2.1 What the router is

A lightweight decision layer inside the `/api/art-official/chat` route that intercepts every incoming request and determines which model handles it before any model is called.

It is not a separate service. It is a function — `routeRequest()` — that runs server-side at the top of the API route handler, before the Anthropic client is invoked.

---

### 2.2 The decision boundary

Two questions determine routing:

**1. Does this task require understanding of meaning, intent, or practice context?**
If yes → Claude.

**2. Is the output a structured value derivable from explicit inputs without reasoning?**
If yes → small model.

The boundary is not about task difficulty. Extracting dimensions from `"60 × 80 cm painted on linen"` is easy for Claude — but it doesn't need Claude. Asking "where does this work sit in the art historical conversation around photo transfer?" requires Claude even if the answer is brief.

---

### 2.3 Routing table

| Trigger | Task | Route |
|---|---|---|
| Image uploaded | Trigger image analysis pipeline | Small model (CLIP) |
| Image uploaded | Generate `firstImpression` blind description prompt | Claude |
| Dimension string received | Parse and normalise to `{ widthCm, heightCm, depthCm }` | Small model |
| Dimension values confirmed | Derive `sizeTier` and `orientation` | Small model |
| Medium string received | Normalise to select value | Small model |
| Series confirmed | Generate candidate tag array | Small model |
| Tag labels confirmed | Look up authority URIs | Small model |
| Artist turn received | Generate next conversational response | Claude |
| Artist turn received | Determine which fields to update | Claude |
| Session phase transition | Decide next phase and question approach | Claude |
| Intent material received | Draft `formalContributionAssessment` | Claude |
| Art historical reference raised | Reason about resonances and connections | Claude |
| Session end triggered | Generate `generate_confirmation_draft` | Claude |
| Session completed | Run quality monitoring pass | Small model |
| Confirmation step | Write final record to Artworks | No model — direct Payload write |

---

### 2.4 Implementation pattern

```typescript
// /api/art-official/chat/route.ts

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, imageUrl, sessionId, artistId, taskHint } = body

  // Step 1 — authenticate
  await authenticateRequest(artistId)

  // Step 2 — route
  const route = routeRequest(body)

  if (route === 'small-model') {
    const result = await handleSmallModelTask(body)
    return Response.json(result)
  }

  // Step 3 — Claude path (existing flow)
  const knowledgeSections = await assembleSystemPrompt(artistId)
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: knowledgeSections,
    messages
  })

  // parse, apply tool calls, return
  return Response.json(parseResponse(response))
}

function routeRequest(body: RequestBody): 'claude' | 'small-model' {
  const { taskHint, messages } = body

  // Explicit task hint from client
  if (taskHint === 'dimension-parse') return 'small-model'
  if (taskHint === 'tag-suggestion') return 'small-model'
  if (taskHint === 'uri-lookup') return 'small-model'
  if (taskHint === 'quality-monitor') return 'small-model'

  // Default: conversational turns go to Claude
  return 'claude'
}
```

The `taskHint` field is set by the client — the React component in `/admin/art-official` — based on what triggered the API call. Mechanical operations set an explicit hint. Conversational turns don't set one and default to Claude.

---

### 2.5 Small model options for cloud hosting

No local GPU is required. All of these run via API — same pattern as the Anthropic API call.

| Provider | Models | Best for |
|---|---|---|
| **Together AI** | Llama 3.1 8B, Mistral 7B, Qwen 2.5 7B | General extraction and classification |
| **Groq** | Llama 3.1 8B, Gemma 2 9B | Low-latency structured output (fastest inference) |
| **Fireworks AI** | Llama 3.1 8B, Mistral 7B | Batch enrichment runs |
| **OpenAI-compatible** | `text-embedding-3-small` | Text embedding generation |
| **Replicate** | CLIP ViT-L/14 | Image embeddings (already specced) |

**Recommended pairing for this project:**
- **Groq + Llama 3.1 8B** for in-session routing tasks (fastest response, critical for session latency)
- **Together AI + Llama 3.1 8B** for bulk enrichment (more generous rate limits for batch runs)
- **Replicate** for CLIP image embeddings (already in the implementation plan)

All three use the same OpenAI-compatible API pattern — the same request shape, just a different base URL and API key. The router can swap providers without changing the task logic.

---

### 2.6 Cost model

A rough comparison for a single Art/Official session (~20 turns):

| Operation | Model | Approx cost |
|---|---|---|
| 20 conversational turns | Claude Sonnet 4.6 | ~$0.08 |
| Dimension parse + normalisation | Llama 3.1 8B (Groq) | ~$0.0002 |
| Tag suggestion pass | Llama 3.1 8B (Groq) | ~$0.0005 |
| URI lookups (5 tags) | Llama 3.1 8B (Groq) | ~$0.0003 |
| Quality monitoring pass | Llama 3.1 8B (Together) | ~$0.001 |
| CLIP image embedding | Replicate | ~$0.001 |
| **Total session cost** | | **~$0.083** |

Without routing (all tasks through Claude Sonnet): ~$0.12–0.15 per session depending on context length.

The saving per session is modest. The saving across a bulk enrichment run of the full back-catalogue is significant — hundreds of records at Haiku or Groq pricing vs Sonnet pricing is a meaningful difference.

---

## 3. What the Router Does Not Change

The conversation contract in `art-official-dialogue-spec.md` is unchanged. The artist never sees routing decisions. The sidebar still populates in real time. The confirmation step still requires explicit artist sign-off.

The router is invisible infrastructure. Its job is to make the session cheaper and faster without changing what the artist experiences.

---

## 4. Implementation Sequence

This is not part of the current 17-step Artist Archive build. It is a Phase 5 addition, after the core archive is stable.

Suggested order:
1. Add `taskHint` field to the API request body schema
2. Implement `routeRequest()` function with explicit hint routing only (no inference)
3. Integrate Groq client alongside the Anthropic client in the API route
4. Implement dimension parsing and normalisation as the first routed task — lowest risk, easily testable
5. Add tag suggestion routing
6. Add URI lookup routing
7. Add post-session quality monitoring as a background job
8. Add bulk enrichment runner as a separate script/job

Test each step against a real session before moving to the next. The completion test for each step: the same session produces identical field output regardless of which model handled the mechanical task.

---

*Small Model Architecture · May 2026*
*Designed for bernardbolter.com · Art/Official hybrid infrastructure*
*Companion documents: `art-official-dialogue-spec.md`, `artist-archive-schema-final.md`, `cursor-implementation-plan-final.md`*

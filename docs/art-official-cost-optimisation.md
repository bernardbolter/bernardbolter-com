# Art/Official — Cost Optimisation Spec
## Prompt Caching + Model Tiering
*June 2026 · Addendum to art-official-dialogue-spec.md*

Two strategies implemented together. Read alongside `art-official-dialogue-spec.md` Section 8 (API Route Specification). This document specifies only the changes — everything not mentioned remains as specified in the dialogue spec.

---

## Strategy 1 — Prompt Caching

### What it does

The Anthropic API's prompt caching feature marks a portion of the request as cacheable. On subsequent turns within the same session, the cached block is not re-processed — input token cost for that block drops by ~90%. Cache TTL is 5 minutes by default; passing `anthropic-beta: prompt-caching-2024-07-31` extends it.

The system prompt is the right target. It is assembled once per session, is identical on every turn, and is the largest token cost in the request.

### Change to system prompt assembly

The system prompt is no longer passed as a plain string. It is passed as a typed content block array with a `cache_control` marker on the system prompt block.

**Before:**
```typescript
body: JSON.stringify({
  model: 'claude-sonnet-4-5-20251022',
  system: systemPrompt,           // plain string
  messages: conversationHistory,
  tools: toolDefinitions,
  max_tokens: 1024,
})
```

**After:**
```typescript
body: JSON.stringify({
  model: resolveModel(currentPhase),   // see Strategy 2
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' }
    }
  ],
  messages: conversationHistory,
  tools: toolDefinitions,
  max_tokens: 1024,
})
```

### Required header

Add `anthropic-beta: prompt-caching-2024-07-31` to the fetch headers alongside the existing auth and content-type headers. This activates extended TTL caching.

```typescript
headers: {
  'x-api-key': process.env.ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-beta': 'prompt-caching-2024-07-31',
  'Content-Type': 'application/json',
},
```

### What this costs

- Turn 1: full input price on system prompt tokens (same as now)
- Turns 2–N (within TTL): ~10% of input price on system prompt tokens
- Cache write: small surcharge (~25% extra on the cached block, turn 1 only)
- Net: for a 20-turn session, ~50–60% reduction in total input token cost

### No other changes required for caching

The session structure, message history handling, and response parsing are unchanged.

---

## Strategy 2 — Model Tiering by Phase

### Rationale

Not all phases of a cataloguing session need the same model. Early and practical phases involve short, structured exchanges — confirming title, year, medium, dimensions. These do not require Sonnet-class reasoning. The interpretive phases (intent, art historical context, `formalContributionAssessment`) do. Routing by phase captures most of the cost reduction without degrading dialogue quality where it matters.

### Phase map

The session phases from the dialogue spec map to two tiers:

| Phase | Description | Model |
|---|---|---|
| `pre-upload` | Blind description sequence | `claude-haiku-4-5` |
| `identity` | Title, year, series, city confirmation | `claude-haiku-4-5` |
| `physical` | Medium, support, dimensions, process notes | `claude-haiku-4-5` |
| `classification` | Tag confirmation, series context | `claude-haiku-4-5` |
| `intent` | Intent, making note, direct inspiration | `claude-sonnet-4-5` |
| `art-historical` | Art historical references and context | `claude-sonnet-4-5` |
| `late` | Conscious rejections, encounter note | `claude-sonnet-4-5` |
| `confirmation` | Draft generation, final confirmation | `claude-sonnet-4-5` |

The dividing line is the transition from factual to interpretive. Classification sits at Haiku because it is mostly editing agent-drafted tags, not generating meaning.

### Phase tracking in session state

The API route receives `currentPhase` in the request body. The client tracks phase and sends it on every turn.

**Updated request body:**
```typescript
{
  messages: AnthropicMessage[],
  imageUrl?: string,
  sessionId: string,
  artistId: string,
  currentPhase: SessionPhase    // ← added
}
```

**Phase type:**
```typescript
type SessionPhase =
  | 'pre-upload'
  | 'identity'
  | 'physical'
  | 'classification'
  | 'intent'
  | 'art-historical'
  | 'late'
  | 'confirmation'
```

**Model resolver (add to route utilities):**
```typescript
const HAIKU_PHASES: SessionPhase[] = [
  'pre-upload',
  'identity',
  'physical',
  'classification',
]

function resolveModel(phase: SessionPhase): string {
  return HAIKU_PHASES.includes(phase)
    ? 'claude-haiku-4-5'
    : 'claude-sonnet-4-5-20251022'
}
```

### Caching across model switches

Prompt caching is model-specific — a cache hit only occurs when the same model receives the same cached block. When the session transitions from Haiku to Sonnet at the `intent` phase, turn 1 on Sonnet pays full system prompt cost. All subsequent Sonnet turns within the TTL window hit cache.

This means there are two cache-prime turns per session (one Haiku prime, one Sonnet prime) rather than one. Still a significant saving overall.

### Phase transition — client responsibility

The client (Art/Official custom view) is responsible for tracking and advancing `currentPhase`. Phase does not advance automatically — it advances when the agent signals a phase transition via a tool call, or when the artist manually advances it (a fallback escape hatch in the UI).

**Add a `set_phase` tool to the tool definitions in Section 4:**

```typescript
{
  name: 'set_phase',
  description: 'Advance the session to the next phase. Call when the current phase fields are sufficiently captured and the conversation is ready to move on.',
  input_schema: {
    type: 'object',
    properties: {
      phase: {
        type: 'string',
        enum: [
          'pre-upload', 'identity', 'physical',
          'classification', 'intent', 'art-historical',
          'late', 'confirmation'
        ],
        description: 'The phase to transition to.'
      },
      reason: {
        type: 'string',
        description: 'One-line internal note on why the phase is advancing. Not shown to artist.'
      }
    },
    required: ['phase']
  }
}
```

The route returns `phaseTransition: phase` in the response body when this tool is called. The client updates its phase state and sends the new phase on the next turn.

**Updated response body:**
```typescript
{
  message: string,
  fieldUpdates: FieldUpdate[],
  sessionFieldUpdates: SessionField[],
  phaseTransition?: SessionPhase    // ← added; present only when set_phase called
}
```

---

## Strategy 3 — Token Logging (recommended alongside both)

Add per-turn token logging to the route so you can see exactly where cost is going. Anthropic returns usage data in every response.

```typescript
const usage = responseData.usage
await payload.update({
  collection: 'sessions',
  id: sessionId,
  data: {
    tokenLog: [
      ...(existingSession.tokenLog || []),
      {
        turn: conversationHistory.length,
        phase: currentPhase,
        model: resolveModel(currentPhase),
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
        timestamp: new Date().toISOString(),
      }
    ]
  }
})
```

Add `tokenLog` as a JSON field to the Sessions collection. Not exposed publicly. Visible in admin for session review.

After a few real sessions, this data will tell you whether the Haiku/Sonnet split is landing in the right place, and whether caching is hitting as expected.

---

## Implementation order

1. **Prompt caching first** — one header, one body change. No new client state. Measure impact.
2. **Token logging** — add alongside caching so you have baseline data before tiering.
3. **Model tiering** — requires client phase tracking and `set_phase` tool. Do after caching is confirmed working.

---

## What NOT to do

- ✗ Do not cache the `messages` array — conversation history changes every turn and caching it would return stale context.
- ✗ Do not use Haiku for the `intent` or `confirmation` phases. These are where the quality difference is real and the session cost is already mostly captured by caching.
- ✗ Do not advance phase automatically based on turn count. Phase advances when content is captured, not when a turn number is reached.
- ✗ Do not expose `currentPhase` or `tokenLog` in any public API response.
- ✗ Do not remove the `set_phase` tool from Haiku turns — the agent needs it to signal transition to Sonnet.

---

*Addendum to art-official-dialogue-spec.md · June 2026*
*Implement after Step 12 of cursor-implementation-plan-final.md is complete*

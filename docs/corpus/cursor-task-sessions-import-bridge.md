# Cursor Task: Chat Session Import Bridge
## Add `sessions` as a valid writes[] target in the multi-collection import envelope
*July 24, 2026 — closes the gap flagged in `sessions-audit-handoff.md` ("chat-session-import-bridge-spec.md — not started")*

Read alongside: `sessions-collection-and-importer-brief.md` Part 4 (envelope shape), `art-official-field-source-of-truth.md` Part 2b (confirmed working envelope shapes), `session-flow-revision-brief.md` Part 2 (Sessions schema).

---

## The problem, concretely

Pasting a `writes[]` envelope with a `"collection": "sessions"` entry currently fails outright:

```
{ "code": "invalid_union", "discriminator": "collection",
  "options": ["artworks", "bio-timeline", "statement-throughlines"],
  "message": "Invalid discriminator value. Expected 'artworks' | 'bio-timeline' | 'statement-throughlines'" }
```

`sessions` isn't in the discriminated union at all. There's no way to import a session transcript/record through the importer right now — manual Payload admin entry is the only path, which doesn't scale past occasional one-off sessions.

This also creates a **secondary, harder problem**: `statement-throughlines` entries require a valid, already-existing `sourceSessionRef`. If a session and its throughline are both new, there's currently no way to write both in one paste — the throughline write fails because the session it references doesn't exist yet, and there's no way to create that session through the importer to begin with.

---

## What to build

### 1. Add `sessions` to the `collection` discriminated union

Alongside `artworks`, `bio-timeline`, `statement-throughlines`. Same `.strict()` Zod validation standard as the other three (per the 2026-07-23 priority fix — unknown/misspelled keys reject with a named error, never silently strip).

### 2. Write shape

```ts
{
  collection: "sessions",
  operation: "set",
  sessionId: string,           // required — the primary key/lookup value
  fields: {
    sessionType: "artwork" | "statement" | "event",
    primaryArtwork?: string,          // artwork slug relation
    mentionedArtworks?: string[],     // artwork slug relations, independently queryable from primaryArtwork
    status: "in-progress" | "completed",
    firstImpression?: string,
    secondDescription?: string,
    proposedAbstracts?: Array<{
      targetCollection: "bio-timeline" | "statement-throughline",
      text: string,
      status: "proposed" | "accepted" | "edited" | "rejected"
    }>,
    sessionNotes?: string,
    messages: Array<{ role: "user" | "assistant", content: string }>
  }
}
```

### 3. Upsert semantics, keyed by `sessionId`

- `operation: "set"` on `sessions` should **create the record if `sessionId` doesn't exist yet, or overwrite it in full if it does** — same idempotent-by-nature behavior as `set` already has for `artworks`. Re-pasting the same session envelope should be safe, not additive/duplicating.
- `messages` is replaced wholesale on each `set`, not merged/appended — a session transcript is written once, as a complete unit, not incrementally through this importer. (Live incremental per-turn saving, if/when built, is a separate mechanism per `sessions-collection-and-importer-brief.md` Part 3 — out of scope here.)

### 4. Cross-reference resolution within a single envelope

This is the important part, not just the discriminator fix. When an envelope contains **both** a `sessions` write and a `statement-throughlines` (or `bio-timeline`) write referencing that same `sourceSessionRef`:

- **Process `sessions` writes first**, before any write that references a `sourceSessionRef`, regardless of array order in the pasted JSON. Don't require the artist to have already pasted the session in a prior, separate request.
- After the `sessions` write succeeds, `sourceSessionRef` validation for other writes in the *same* envelope should check against the just-created record, not only against what already existed in the database before this paste began.
- If the envelope has a `statement-throughlines` (or `bio-timeline`) entry whose `sourceSessionRef` matches no `sessions` write in the same envelope **and** no existing Sessions record, that write should still fail clearly (current behavior is correct there) — this only fixes the case where the session is being created in the same paste.

### 5. Idempotency check unaffected

No change to the existing `append` idempotency rule for `bio-timeline`/`statement-throughlines` (skip if same `sourceSessionRef` + identical `text` already exists) — that logic is orthogonal to this fix and should keep working as-is once the session itself can actually be created via import.

---

## What NOT to do

- Do NOT make the envelope atomic as a side effect of this fix — each `writes[]` entry still succeeds/fails independently, per the existing rule. A `sessions` write succeeding while a `statement-throughlines` write in the same paste fails for an unrelated reason should still report partial success, same as today.
- Do NOT build a separate live/incremental session-saving mechanism as part of this task — that's `sessions-collection-and-importer-brief.md` Part 3, a different piece of work. This task is specifically: whole-session import via the existing envelope pattern.
- Do NOT relax `.strict()` validation on the `sessions` shape to "make it easier to paste" — same validation rigor as the other three collections.

---

## Verification checklist

- [x] Pasting a `writes[]` envelope with `"collection": "sessions"` no longer throws `invalid_union` — `sessions` is a valid discriminator value
- [x] A `sessions` `set` write creates a new record when `sessionId` doesn't exist, and fully overwrites when it does
- [x] Re-pasting an identical `sessions` write is safe — no duplication, same end state
- [x] An envelope containing both a new `sessions` write and a `statement-throughlines` write referencing that same `sourceSessionRef`, in one paste, succeeds on both — session creation is processed before the dependent write, regardless of their order in the pasted array
- [x] An envelope with a `statement-throughlines` write referencing a `sourceSessionRef` that matches neither an existing record nor any `sessions` write in the same envelope still fails clearly, with the existing "Session not found" error
- [x] Unknown/misspelled keys in a `sessions` write reject with a named `.strict()` error, consistent with `artworks`/`bio-timeline`/`statement-throughlines`

*Implemented July 24 2026: `archiveImportSchemas.ts` + `applyEnvelopeImport.ts` (`orderEnvelopeWrites`, upsert by `sessionId`). Envelope `sessionType` shorthand `artwork`/`statement`/`event` maps to Payload `artwork-cataloguing`/`artist-statement`/`event-enrichment`.*

---

*July 24, 2026 · Closes the "chat-session-import-bridge-spec.md — not started" item from sessions-audit-handoff.md*

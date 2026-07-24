# Sessions Audit Findings & Integrity Fixes — Cursor Spec
*Derived from a full read-through of all 20 completed Art/Official sessions, July 24, 2026.*
*Read alongside `art-official-dialogue-spec.md`, `art-official-field-source-of-truth.md`, `corpus-relation-fields-and-linchpin-sessions-spec.md`, `sessions-tier5-machine-access-spec.md`, `sessions-jsonld-categorization-spec.md`.*

## Purpose

This spec turns the sessions audit into buildable work. It does four things:

1. Supplies the changelog entry for `art-official-dialogue-spec.md` (Part 1) — the entry the July 23 session designed the process for but never wrote.
2. Adds new Sessions schema fields to catch the failure patterns the audit found — mostly auto-computed, not artist-filled, since the audit's clearest finding is that artist-filled annotation (`DialogueSelfAudit`) almost never happens in practice (Part 2).
3. Fixes the four concrete, repeatable bugs the audit surfaced (Part 3).
4. Redesigns the public `/sessions` display using the new fields (Part 4).

**Before starting: check whether `/admin/art-official/audit` (Phase F2, designed in an earlier chat) has been built.** If it exists, Part 4 of this spec may be partially redundant with it — reconcile rather than duplicate.

---

## Part 1 — Changelog entry for art-official-dialogue-spec.md

Add to the Changelog section (create one, mirroring `art-official-field-source-of-truth.md`, if it doesn't exist yet):

> **2026-07-24** — Full audit of all 20 completed sessions (see `sessions-audit-handoff.md`). Confirmed the Venice Biennale 2007 premature-closure pattern is one instance of a general rule: linchpin sessions need slower pacing throughout, not just as a one-off fix. Found a more common and previously undocumented failure: automatic fields (`dominantColors`, `paintedFieldColors`, `compositionalNotes`, all five tag fields) are re-derived from scratch every session with no check against already-committed values, producing silent contradictions across repeat sessions on the same artwork — confirmed on **Brandenburger Tor. 1899** (4 sessions, tags and overlay colors regenerated differently each time, concept copy rewritten twice with contradictory narratives) and, at lower severity, **BASEL switzerland** (2 sessions). Also found: repeated commit-time invalid-enum errors across unrelated fields (`availabilityStatus`, `artHistoricalReferences`, `dimensionUnit`) with no in-dialogue visibility into valid options before staging; one blind-description/upload mismatch not caught automatically (**South Elliott and Lafayette** — artist described a different painting than the one uploaded); transcript padding from unlogged tool-call turns logged as empty messages (also present in the June 24 **Venice in the Middle** session); and `artism:DialogueSelfAudit` unfilled in 19 of 20 sessions read, including several with concrete, nameable failures well-suited to `weakPhases`/`dialogueRefinementFlag`. Resulting schema and pipeline changes in `sessions-audit-cursor-spec.md`.

---

## Part 2 — Schema additions: Sessions collection

These are deliberately **auto-computed where possible**. The audit's strongest single finding is that fields requiring the artist to remember to fill them in after the fact (`sessionNotes`, `weakPhases`, `dialogueRefinementFlag`, etc.) are used in 1 of 20 sessions. Anything that can be detected mechanically should be.

```ts
// New field — auto-computed at commit from fieldUpdateTimeline
{
  name: 'fieldsCoveredThisSession',
  type: 'array',
  admin: {
    description: 'Auto-populated at commit: deduplicated list of field names written during this session, pulled from fieldUpdateTimeline. Used to generate the /sessions gloss (Part 4) and to give revisit sessions a real "here\'s what\'s already covered" survey instead of relying on the agent to reconstruct it from memory.',
    readOnly: true,
  },
  fields: [
    { name: 'field', type: 'text' },
  ],
},

// New field — auto-detected, not artist-filled
{
  name: 'priorFieldConflicts',
  type: 'array',
  admin: {
    description: 'Auto-populated when a field being staged this session already has a different committed value from a prior session on the same artwork. See Part 3a for the detection logic. This is the mechanical record of "the dialogue re-derived something and got a different answer" — distinct from dialogueRefinementFlag, which is a subjective artist judgment.',
  },
  fields: [
    { name: 'field', type: 'text', required: true },
    { name: 'priorValue', type: 'json' },
    { name: 'priorSessionRef', type: 'relationship', relationTo: 'sessions' },
    { name: 'newValue', type: 'json' },
    { name: 'resolution', type: 'select', options: ['kept-prior', 'replaced', 'merged', 'unresolved'], defaultValue: 'unresolved' },
  ],
},

// New field — mixed auto-detection + optional artist note
{
  name: 'sessionStruggleFlag',
  type: 'group',
  admin: {
    description: 'Distinct from dialogueRefinementFlag (a subjective judgment about dialogue quality). This is mechanical: did something go wrong at the tooling/schema level. Auto-set true if any struggleType condition fires; note is optional artist context.',
  },
  fields: [
    { name: 'hasStruggle', type: 'checkbox', defaultValue: false },
    {
      name: 'struggleTypes',
      type: 'select',
      hasMany: true,
      options: ['commit-error', 'description-upload-mismatch', 'blank-turn-density', 'unresolved-lookup-failure', 'other'],
      admin: { description: 'commit-error = any staged value rejected at commit. description-upload-mismatch = Part 3c fired. blank-turn-density = >20% of messages array is empty content. unresolved-lookup-failure = an external lookup (Wikidata/TGN/etc) failed and was never retried successfully within the session.' },
    },
    { name: 'note', type: 'textarea' },
  ],
},
```

```ts
// Modify existing revisitOf field — add auto-suggestion, not auto-force
```

`revisitOf` already exists (see `corpus-relation-fields-and-linchpin-sessions-spec.md`). Currently nothing populates it automatically. Add: at session start, if the artist provides or the session infers a `primaryArtwork` slug, query for any other **completed** session with the same `primaryArtwork`. If found, surface it to the agent as context (not force a field value) — the agent should open by surveying what that prior session covered (using its `fieldsCoveredThisSession`) before asking anything, the way the Basel session-2 revisit did well. If the artist confirms this is a genuine revisit, set `revisitOf` and offer `corpus-revisit` as the `sessionType`; if it's a correction of a mismatched artwork (as in the Brandenburger Tor case), leave `sessionType` as `artwork-cataloguing` — `revisitOf` describes the relationship regardless of `sessionType`.

---

## Part 3 — Fixes

### 3a. Automatic-field conflict check (highest priority — this is the Brandenburger Tor / Basel bug)

Applies to: `dominantColors`, `paintedFieldColors`, `compositionalNotes`, `movementTags`, `styleTags`, `subjectTags`, `genreTags`, `periodTags`, `ach.overlay.overlayColors`, `ach.overlay.overlayRects`, and any other field whose `source` is `image-analysis` or `knowledge-base` rather than `conversation`.

Before staging any such field:
1. Query the artwork's currently **committed** value for that field (not other staged-but-uncommitted sessions — the live Artworks record).
2. If no committed value exists, stage normally.
3. If a committed value exists and the new value is materially different (exact match for scalars/enums; for arrays like tag lists, different if not a superset), do **not** silently stage the new value as the presented result. Instead:
   - Write an entry to `priorFieldConflicts` (Part 2) with both values.
   - Surface one consolidated question to the artist: *"[Field] is already set to [X] from a prior session. Fresh analysis suggests [Y]. Keep the original, replace it, or merge?"* — batch these into one question per session if multiple automatic fields conflict, don't ask one-by-one.
   - Only write the final chosen value at commit, and set `resolution` on the `priorFieldConflicts` entry accordingly.
4. This check runs once per field per session, at the point the field would otherwise be silently staged (typically right after image analysis or at the tag-staging step) — not retroactively at commit.

### 3b. Enum/schema validation before staging

Every `select` or enum-typed field the dialogue writes to must be validated against the live Payload schema's option list **before** it is presented to the artist as staged, not discovered as a commit-time error. Concretely:
- `availabilityStatus`, `dimensionUnit`, `currentLocation.category`, and any other select field: fetch valid options at session start (or cache from schema), and never stage a value outside that list.
- `artHistoricalReferences` (a curated relationship field, not free text — see `art-official-field-source-of-truth.md` 2026-07-23 audit) must never receive prose. If the dialogue wants to write art-historical prose, it belongs in `artHistoricalContext` (textarea) — enforce this at the tool-call level, not just in dialogue instructions, so it's structurally impossible to repeat the Brandenburger Tor error.
- `descriptionShort`: apply the same max-length (400 char) validation client-side when the draft is generated, and regenerate automatically if it's over, rather than presenting an over-length draft and waiting for a commit error to catch it. This exact error occurred twice (Cliff House . 1863, South Elliott and Lafayette) and was fixed cleanly both times — the fix should happen before the artist ever sees the problem.

### 3c. Description/upload mismatch check

Immediately after the primary image is uploaded and before proceeding with the rest of the session:
1. Run image analysis (this already happens for `dominantColors` etc.).
2. Do a lightweight consistency check between `firstImpression` (the artist's pre-upload blind description) and what the image analysis actually shows — not full semantic verification, just a check for named, checkable objects (e.g. "yellow bus," "concrete pyramid," a specific color field) that have no plausible visual counterpart in the uploaded image.
3. If the check fails, the agent should say so directly before continuing — *"This doesn't look like what you described — are we looking at the same piece?"* — rather than proceeding on the mismatched premise, as happened in the South Elliott and Lafayette session (caught only because the artist noticed independently).
4. Log this on `sessionStruggleFlag.struggleTypes` as `description-upload-mismatch` if it fires.

### 3d. Stop logging blank tool-call turns

The `messages` array currently logs tool-call-only turns as `{"role": "user"/"assistant", "content": ""}` pairs, roughly doubling transcript length in image-analysis-heavy sessions with no signal. Fix at the point messages are appended to the session record: omit turns with empty content entirely, or replace them with a minimal structured marker (e.g. `{"role": "assistant", "content": "", "toolCall": true}`) so transcript length reflects actual dialogue. Apply retroactively is optional (existing sessions can stay as-is); this is a go-forward fix.

### 3e. Non-artwork sessions have no public Tier 5 path (flag only, not a build item)

`event-enrichment` and `artist-statement` sessions have no `primaryArtwork`, so their `/sessions/[id]` crumb pages currently render no corpus-API link at all — there's no public path to their content beyond type + date. This wasn't caught in the original Tier 5 spec because it was designed against artwork-cataloguing sessions. **This needs a decision from Bernard, not a default build**: either (a) build a session-level endpoint (e.g. `/api/corpus/sessions/[id]?tier=5`) independent of artwork slug, or (b) leave these session types intentionally more private, consistent with them not producing an Artworks record. Do not build (a) without confirming — it's a real access-policy question, not a bug.

---

## Part 4 — `/sessions` display redesign

Currently: bare crumb list (type, date, linked artwork). Replace the per-session summary line with a short, honest gloss generated from the new fields, keeping the raw JSON link below it (per the existing pattern established for CLIP similarity — describe, don't dump).

Gloss generation logic (server-side, at render time or cached at commit):
- Base: `"{sessionType label} — {fieldsCoveredThisSession.length} fields confirmed"`
- If `revisitOf` is set: prepend `"Revisit ({n}th pass on this artwork) — "` where n is computed from count of sessions sharing the same `primaryArtwork`.
- If `sessionStruggleFlag.hasStruggle`: append `", {struggleTypes joined} flagged"` — e.g. `", 1 commit error flagged"`.
- If `linchpinFlag.isLinchpin`: prepend a distinct visual marker (already exists per the JSON-LD/categorization spec — keep consistent styling here).
- If `priorFieldConflicts` is non-empty: append `", {n} field conflict(s) resolved"`.

Example output lines:
- `"Cataloguing pass — 9 fields confirmed"`
- `"Revisit (4th pass on this artwork) — 5 fields confirmed, 2 field conflicts resolved"`
- `"Cataloguing pass — 12 fields confirmed, 1 commit error flagged"`

Keep the existing filter UI (type, series, date range, linchpin) as-is; add a filter for `sessionStruggleFlag.hasStruggle` so struggling sessions are findable at a glance, mirroring how linchpin sessions are already filterable.

---

## Do NOT

- Do not auto-resolve field conflicts (Part 3a) by picking one value — always surface to the artist. Silent resolution is exactly the bug being fixed.
- Do not force `sessionType` to `corpus-revisit` automatically — only suggest it; some repeat sessions on the same artwork are corrections, not revisits (see Brandenburger Tor sessions, which were never meant to be revisits, just repeated re-derivation).
- Do not build a session-level Tier 5 endpoint (Part 3e option a) without an explicit decision — flag and wait.
- Do not retroactively rewrite existing session transcripts to strip blank turns (Part 3d) — go-forward only, to avoid altering the historical record.
- Do not let `priorFieldConflicts` or `sessionStruggleFlag` count toward or substitute for `dialogueRefinementFlag` — they're mechanical detection, not a replacement for the artist's subjective annotation layer, which should still be encouraged separately.
- Do not apply the automatic-field conflict check (Part 3a) to fields with `source: 'conversation'` — only `image-analysis` and `knowledge-base` sourced fields are in scope. Artist-stated facts that change between sessions (e.g. a corrected year) are normal and shouldn't be flagged as conflicts.

---

## Build order

**Step 1** — Add the three new Sessions fields (`fieldsCoveredThisSession`, `priorFieldConflicts`, `sessionStruggleFlag`) and the `revisitOf` auto-suggestion logic (Part 2).

**Step 2** — Implement the automatic-field conflict check (Part 3a) at the point automatic fields are staged. This is the highest-value fix — it directly addresses the confirmed, repeated Brandenburger Tor / Basel bug.

**Step 3** — Implement enum/schema validation before staging (Part 3b), including the structural fix preventing prose from ever reaching `artHistoricalReferences`.

**Step 4** — Implement the description/upload mismatch check (Part 3c).

**Step 5** — Fix blank-turn logging (Part 3d), go-forward only.

**Step 6** — Add the changelog entry to `art-official-dialogue-spec.md` (Part 1) — this can happen any time, independent of the build steps.

**Step 7** — Redesign the `/sessions` display (Part 4), once Steps 1–3 give it real data to render.

**Step 8** — Flag Part 3e to Bernard as an open decision; do not build without a decision.

---

## Verification checklist

- [x] `fieldsCoveredThisSession` populates correctly at commit on a test session, deduplicated *(commit route wired; unit-tested extractor)*
- [x] `priorFieldConflicts` fires correctly when a second session on the same artwork produces a different `dominantColors`/tag value than an already-committed one, and does NOT fire for `conversation`-sourced fields *(unit-tested + staging gates)*
- [x] Conflict question batches multiple conflicting automatic fields into one artist-facing question, not one per field
- [x] `availabilityStatus`, `dimensionUnit`, `currentLocation.category` staging is validated against live schema options before presentation
- [x] `artHistoricalReferences` structurally rejects prose at the tool-call level (not just via dialogue instruction)
- [x] `descriptionShort` drafts are generated under 400 characters automatically
- [x] Description/upload mismatch check correctly flags a deliberately mismatched test case
- [x] New sessions no longer log empty-content tool-call turns; existing sessions unchanged
- [x] `revisitOf` is suggested (not forced) when a new session shares `primaryArtwork` with a completed session
- [x] `/sessions` gloss line + `hasStruggle` filter
- [x] Changelog entry present in `art-official-dialogue-spec.md` / field source-of-truth
- [x] Part 3e decision explicitly requested from Bernard, not defaulted — **decided 2026-07-24: (a) public session-level Tier 5 at `/api/corpus/sessions/[sessionId]?tier=5`**

---

*Sessions audit findings & integrity fixes · July 24, 2026*
*Derived from: Bernard Bolter × Claude, full read-through of 20 completed Art/Official sessions*
*Status: complete draft — ready for Cursor implementation*

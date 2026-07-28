# Session Flow Transcript Eval Rubric (A2/A3/A4)

Use this rubric to evaluate live admin Art/Official transcripts after prompt updates.

Scope: `artwork-cataloguing` sessions only.

## Preconditions

- Session is run in Payload admin chat (not envelope import).
- Transcript includes blind description, image upload, and at least one wrap-up attempt.
- Reviewer has access to transcript text and confirmation-panel snapshot/notes.

## Reality Check: Events Tool Path

Before scoring, confirm this build has working Events linkage tools for artwork sessions:
- `search_events`
- `create_event_stub`
- `link_artwork_to_event`

Current repo status: implemented and wired in `agentTools.ts` + `applyAgentTool.ts` + `createEventStub.ts` (writes `Events.artworks`).

If this ever regresses, do **not** force a fail on A4 for tool invocation; instead mark `infra-blocked` and require fallback policy review.

---

## Scoring Grid (Per Transcript)

Score each criterion as:
- `2` = pass
- `1` = partial
- `0` = fail
- `N/A` = not applicable with explicit artist deferral

### A2 — Light Acknowledgment (Step 4)

1) **Length and compression**
- Pass (`2`): First post-upload acknowledgment is 2-4 sentences.
- Partial (`1`): 5-6 sentences but still concise.
- Fail (`0`): long paragraph / full comparative analysis.

2) **No deep reconciliation**
- Pass (`2`): No full blind-vs-image correction/interpretive synthesis at this beat.
- Partial (`1`): Minor drift into interpretation but re-ask still clearly deferred.
- Fail (`0`): full reconciliation done here, leaving little for step 8.

### A3 — Formal Re-Ask (Step 8)

3) **Distinct late beat exists**
- Pass (`2`): Separate explicit late-turn re-ask occurs before final draft/commit.
- Partial (`1`): implied but weakly separated.
- Fail (`0`): absent or merged into step 4.

4) **References firstImpression and stores second description**
- Pass (`2`): Re-ask explicitly references earlier blind description and second description is captured.
- Partial (`1`): references blind description but storage unclear.
- Fail (`0`): no explicit return to blind description and/or no second description capture.

### A4 — Where-Has-This-Lived (Step 7)

5) **Block coverage or explicit deferral**
- Pass (`2`): Location, ownership/provenance, exhibition handling, sales/insurance (when relevant) addressed OR explicit artist deferral recorded.
- Partial (`1`): one major sub-area missed without deferral.
- Fail (`0`): block effectively skipped.

6) **Exhibition handling path**
- Pass (`2`): Uses Events path (search -> confirm -> link; optional stub if absent) and does not park shows in `workContext`.
- Partial (`1`): mentions Events path but execution incomplete.
- Fail (`0`): writes exhibition facts as free text fallback despite tools being available.

---

## Pass/Fail Thresholds

For a transcript to pass A2/A3/A4:
- No `0` on criteria 2, 3, or 6 (hard-fail criteria), and
- Total score >= 10/12 (excluding `N/A` rows from denominator, normalized proportionally).

Batch signoff (recommended):
- Run at least 3 transcripts:
  - one new artwork
  - one refinement/stubbed artwork
  - one session with explicit exhibition mention
- Pass if at least 2/3 transcripts pass and no repeated hard-fail pattern appears.

---

## Eval Record Template

Copy/paste per transcript:

```md
Transcript:
Session ID:
Session type:
Evaluator:
Date:

A2.1 Length/compression: 0|1|2
Evidence:

A2.2 No deep reconciliation at step 4: 0|1|2
Evidence:

A3.1 Distinct formal re-ask exists: 0|1|2
Evidence:

A3.2 References firstImpression + captures second description: 0|1|2
Evidence:

A4.1 Where-has-this-lived coverage or explicit deferral: 0|1|2|N/A
Evidence:

A4.2 Exhibition uses Events path (not workContext): 0|1|2|N/A
Evidence:

Total:
Hard-fail triggered? yes|no
Result: pass|fail|infra-blocked
Prompt deltas to apply:
```

## When Failures Occur

- Treat failures as **prompt/flow** defects first, not schema defects.
- Patch `promptBlocks.ts`/`buildSystemPrompt.ts`, re-run transcript eval, then update checklist.
- If failure is infra-related (tool unavailable), mark `infra-blocked` and open a separate wiring ticket.

# Art/Official — Protocol, Contract and Briefing

> **IMPLEMENTED 2026-10-12.** Live surfaces (do not treat this brief as the paste
> source):
> - Protocol: [`/art-official/protocol`](https://bernardbolter.com/art-official/protocol)
> - Contract: [`/art-official/contract`](https://bernardbolter.com/art-official/contract)
> - Briefing: [`/api/corpus/briefing`](https://bernardbolter.com/api/corpus/briefing)
> - Dry-run: `POST /api/art-official/validate`
> Keep this file as the design brief / history of the split.

**Date:** 2026-09-19
**Depends on:** `archive-model-revision-brief.md` (§2.3 standing rules, §5 Phase 3
nightly build)
**Scope:** the Art/Official session protocol, the machine contract for session
JSON, and the briefing file that opens a session. bernardbolter.com only —
art-official.org comes later (§7).

---

## 1. The problem

The session spec was meant to be mirrored between the repo and the chat project.
It isn't holding. There is no single source of truth: the same contract is
described in at least six documents —

- `art-official-source-of-truth.md`
- `art-official-field-source-of-truth.md`
- `cursor-followup-field-decisions.md`
- `art-official-dialogue-spec.md`
- `art-official-consolidated-session-flow-spec.md`
- `session-flow-practice-knowledge.json`

— plus copies in the chat project knowledge and in agent memory. None is
generated. All can drift, and have: specs describe `reinforcingSessions`,
`DialogueSelfAudit` and `agentDraft*` as supported while the importer rejects
them.

**A hand-written page on the website would fail the same way.** The fix is not a
new location, it is a change in how the document is produced.

---

## 2. The split

| Half | Source | Where it lives |
|---|---|---|
| **Contract** — what this build actually accepts | **Generated from code** | bernardbolter.com |
| **Protocol** — how the dialogue runs | **Hand-written, versioned, one document** | bernardbolter.com now; art-official.org later |

The contract keeps breaking because it is described rather than emitted. The
protocol is prose with no code to generate from, but it is currently spread
across five documents that disagree — it needs consolidating, not generating.

---

## 3. Stage 0 — inventory (do this first)

Report only, no changes. This produces the real state of the system.

1. **Where is the contract defined in code?** Expected locations:
   `src/collections/Sessions.ts` (fields, enums, readOnly flags), the commit
   route's envelope validator, the artwork field allowlist, `promptBlocks.ts`
   (field order), and the agent tool definitions (`update_field`,
   `store_session_field`).
2. **Produce the authoritative field list** from that code: name, type, enum
   values, required/optional, readOnly, agent-writable vs automatic.
3. **Produce the rejection list**: every field the importer rejects or silently
   drops, and where the rejection happens.
4. **Diff that against the six documents above.** List every claim in a document
   that the code contradicts. This diff is the most valuable output of the
   stage — it says what has actually been wrong.
5. **Report which rules are Payload/this-build specific** (allowlists, field
   names, endpoint shapes) versus genuinely general (dialogue order, conduct).
   Keep this list growing; it is the diff between the two documents in §7.

---

## 4. The contract page

**Generated nightly from code**, alongside the corpus build. HTML at
`/art-official/contract` (or similar) with a JSON twin. Both from one builder.

Contents:

- Every field the importer accepts: type, enum values, required/optional,
  readOnly, agent-writable vs automatic.
- The envelope shape, with a complete worked example that would validate.
- **Fields explicitly rejected, and why.** This is the section that would have
  saved months.
- The artwork field allowlist.
- Endpoint addresses, current protocol version, generation timestamp.

Standing rules apply: server-rendered visible text, self-contained, no facts
only in `<head>` or JSON-LD, nothing that needs following a link to understand.

### 4.1 Dry-run validate route

`POST /api/art-official/validate` — takes a session JSON, returns what would be
accepted, what would be rejected, and what would be **silently dropped**.
Commits nothing.

Most import pain has been discovering rejections after the fact. This makes the
contract testable rather than readable.

---

## 5. The protocol document

**One hand-written document with a version number**, replacing the five prose
sources. Contents:

- The pre-upload ritual and the four questions (temporal, typological,
  geographic, situational).
- The blind reading beat — **Bernard's** `firstImpression`, before upload. This
  stays; it produced the SFMOMA inversion finding in The Thinker session.
- The order of beats through the session, including where-has-this-lived and the
  closing re-ask of the blind description.
- Conduct rules: what the agent may infer, what it must ask, how candidates are
  proposed and accepted.
- **Additions decided 2026-09-19:**
  - Vision analysis is **non-blind** (A-2.0). Each analysis records its
    conditioning — what the model had access to.
  - Throughline and bio-entry candidates are proposed **with a short slug and a
    short title (4–6 words)**, accepted or amended in the same exchange.
    Otherwise every session creates another paragraph-slug.
  - Sessions carry a **throughline block**: id, one of
    create / reinforce / extend / weaken, the evidence line in Bernard's words,
    the turn it came from, and for extend/weaken the proposed new wording
    alongside the old. The agent proposes; Bernard accepts.
  - **Revisits:** the session must know what previous sessions committed, and
    confirm, correct or add rather than re-derive. (Brandenburger Tor: four
    sessions, re-derived tags and colours, contradictory concept copy.)
- Every session export records **which protocol version it ran under**, the way
  vision analyses record their prompt version. An old session's shape is then
  explicable rather than simply wrong.

Anything in the five current documents that the Stage 0 diff shows to be false
is deleted, not carried forward. Mark the old documents superseded rather than
leaving them to be found.

---

## 6. The briefing file

A session needs three things: protocol, contract, corpus. Three pastes is three
round trips, and the corpus changes daily.

**One URL instead:** `/api/corpus/briefing`, built nightly.

**Order matters** — it is read once, top to bottom, and the end carries less
weight than the beginning:

1. Version, generation date, and a line stating that live endpoints supersede
   this file.
2. **Protocol** (from §5).
3. **Contract** (from §4).
4. **Corpus:**
   - Every work: identity, series, status, gist.
   - Full record fields for reasoning-complete works (29 of 220).
   - Committed automatic fields for works with prior sessions.
   - Throughlines with their member works.
   - Session ledger: which sessions exist, which works they touch, what they
     covered — **no transcript text**.

**Target: under ~60k tokens.** Records-only is roughly 150–250 KB; transcripts
would add ~400 KB and crowd out the session itself. Transcripts stay one paste
away for the few that matter.

Known limits to state in the file: it is read once at the top, so anything
committed later in the session is not in it.

### 6.1 Paste protocol

Claude cannot construct URLs or follow in-body links. When it needs something:

- It states what it needs and why, with the URL in a fenced code block, on its
  own line, unbroken, with `https://`.
- Requests are batched, not one at a time.
- It asks only when the answer would change what it says next.

(Turn 26 of The Thinker session is the precedent: Bernard pasted the corpus URL
because Claude could not reach it.)

---

## 7. art-official.org — later

The protocol belongs on the protocol site. Not yet.

Writing it there now would mean hand-copying from the six scattered documents —
the same failure on a new domain. And the protocol can only be written
generically once §3.5 has established which rules are real and which are
artefacts of this build.

**Order:** get it working here → run several sessions against it → lift what
survives unchanged.

Final split:

- **art-official.org** — the protocol as something any artist or archive could
  implement. Written about any practice, not about Bernard.
- **bernardbolter.com** — the contract for this implementation, generated from
  this code. It cannot live on another domain without becoming a copy.

Each links to the other. The briefing composes both.

---

## 8. Sequencing

1. Stage 0 inventory and diff (§3).
2. Contract page generated from code (§4).
3. Validate route (§4.1).
4. Protocol document consolidated, old ones marked superseded (§5).
5. Briefing composition (§6) — depends on the Phase 3 nightly build.
6. Run sessions against it; record what needed changing.
7. Lift the protocol to art-official.org (§7).

Steps 1 and 2 are worth doing before any more cataloguing sessions. Everything
after that is improvement; those two stop the drift.

# Project Consolidation Map
## bernardbolter.com · Artist Archive Project
*May 2026 — written at the schema completion milestone*

This document maps every file in the project folder: what it is, whether it is current or superseded, and what to do with it. Use it to orient any new chat or collaborator instantly.

---

## Files to delete

These documents have been fully absorbed into the new final versions. Their content is either superseded or consolidated. Delete them.

| File | Why it can go |
|---|---|
| `archive-ai-handoff.md` | Early chat prompt from April 2026. All content superseded by `artist-archive-schema-final.md` and `cursor-implementation-plan-final.md`. |
| `art-archive-schema-v01.md` | First schema draft. Superseded by v02, then master, then the final spec. |
| `art-archive-schema-v02.md` | Second schema draft. Superseded by master, then the final spec. |
| `artwork-schema-spec.docx` | Word document spec from April/May 2026. All content absorbed into `artist-archive-schema-final.md`. |
| `art-official-dialogue-brief.docx` | Original Art/Official brief. All content superseded by `art-official-dialogue-spec.md`. |
| `master-schema-spec.md` | The schema spec this project worked from through May 2026. Superseded by `artist-archive-schema-final.md`, which incorporates all updates from the final design session (localisation rule, Artist singleton revision, CV additions, linked records pattern, module separation). |
| `schema-extension-collector-ar.md` | The collector and AR extension spec. Content absorbed into `artist-archive-schema-final.md`. The Collector module will get its own separate document when that build begins. |
| `cursor-implementation-plan-v2.md` | The previous implementation plan. Superseded by `cursor-implementation-plan-final.md`, which is scoped to Artist Archive only and reflects all schema updates. |
| `north-star-brief.md` | A condensed north star brief written April 2026. Good document, but fully superseded by `system-philosophy-and-art-history.md`, which is more complete and is now the permanent reference. |

---

## Files to keep — active and current

These documents are current, actively referenced, and should not be deleted.

### Schema and implementation — the build documents

| File | What it is | Use |
|---|---|---|
| `artist-archive-schema-final.md` | **NEW — May 2026.** The complete, final Artist Archive schema. Covers Artist singleton, Artworks, Events, dependent collections, JSON-LD, AR, series extensions, and Payload implementation guide. Supersedes all previous schema documents. | Primary reference for Cursor when implementing the schema. |
| `cursor-implementation-plan-final.md` | **NEW — May 2026.** Step-by-step build sequence for Cursor, scoped to Artist Archive only. 17 steps across 4 phases with completion tests per step. | Hand each step to Cursor's auto agent for implementation. |

### Art/Official — the agent documents

| File | What it is | Use |
|---|---|---|
| `art-official-dialogue-spec.md` | Full Art/Official agent specification. Covers system prompt architecture, full dialogue roadmap, pre-upload sequence, session opening, phase-by-phase conversation protocol, tool call spec, confirmation step, and hard constraints. | Read in full before implementing Phase 3 of the cursor plan. |
| `art-official-everyone.md` | Design philosophy and decisions for Art/Official as a general transferable tool. Covers onboarding sequence, biography dialogue scenarios, statement dialogue, knowledge pool architecture, feedback loop. | Reference for how the agent is designed to work; context for why decisions were made. |
| `art-official-handoff.md` | Architectural overview. Covers what Art/Official is, where it lives in the stack, build sequencing rationale, and what it is not. | Good orientation document for any new chat picking up the Art/Official build. |

### Philosophy and vision

| File | What it is | Use |
|---|---|---|
| `system-philosophy-and-art-history.md` | The north star document. Covers the honest record project vision, the two structural problems (linear narrative, disinterested criticism), the gaps in available art world data, art historical case studies, provenance and LLM reasoning, the dialogue mechanism as core insight, and funding/independence thinking. | Read once. Reference when any design decision needs testing against the larger vision. |
| `dialogue-summary.md` | Record of the founding conversation (April 2026) in which the project vision emerged. Written in detail to reconstruct the thinking, not just the conclusions. | Project history. Not a technical reference — a record of how the ideas formed. |

### Design system — separate workstream

| File | What it is | Use |
|---|---|---|
| `design-system.md` | The complete design system for bernardbolter.com. Tokens, typography, spacing, component patterns, responsive rules. | Reference for all frontend implementation. |
| `design-system-visual.html` | Visual rendering of the design system. | Open in browser to see the design system as a living reference. |
| `design-system-extraction-template.md` | Template for extracting design systems from existing codebases. | Used when porting Sass variables to the new system. |
| `porting-guide.md` | Guide for porting existing components from the WordPress/Sass stack to Next.js/Tailwind. | Reference during frontend implementation. |

---

## Module separation decision — recorded here

As of May 2026, the project has formally separated into three independent modules:

**Module A — Artist Archive** (this project)
- Collections: Artist, Artworks, Series, Events, Tags, ArtHistoricalReferences, PracticeKnowledge, Sessions
- Payload instance: bernardbolter.com
- Status: schema complete, ready to build

**Module B — Gallery** (future)
- Covers: Gallery collection, GalleryArtist profiles, programme management, MonthlyFeature, PullUp-specific extensions (StickerLocation)
- Status: not yet specced. Design session pending.

**Module C — Collector** (future)
- Covers: Collector collection, CollectionKnowledge, collector-catalogued artwork records
- Status: partially specced in the now-deleted `schema-extension-collector-ar.md`. Will be fully specced in its own document when that build begins.

**Cross-module linking pattern:**
The three modules share a common data vocabulary and connect through explicit external identifiers and linked record relations — not a shared database. The canonical artwork record lives in Module A (artist-catalogued). Gallery and Collector modules hold their own record layers with `linkedArtistRecord` relations pointing back to Module A where the artist is on the platform.

---

## What to drop into any new chat

**For Artist Archive schema / implementation work:**
Drop `artist-archive-schema-final.md` and `cursor-implementation-plan-final.md`. These two documents are self-contained for the build.

**For Art/Official work:**
Drop `art-official-dialogue-spec.md` and `art-official-handoff.md`. Reference `artist-archive-schema-final.md` for field names.

**For design / frontend work:**
Drop `design-system.md` and `porting-guide.md`.

**For a new chat that needs full context:**
Drop `system-philosophy-and-art-history.md` (vision), `artist-archive-schema-final.md` (schema), and this consolidation map (orientation).

---

*Consolidation map written May 2026 at the Artist Archive schema completion milestone.*
*Next milestone: Gallery module design session.*

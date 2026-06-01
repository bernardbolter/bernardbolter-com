
# /studio — Specification Addendum
## bernardbolter.com · Studio App
*May 2026 — addendum to studio-app-spec.md*

---

## Overview

This addendum covers three additions to the core spec:

1. **Lines** — a personal taxonomy of active ideas and investigations that cuts across all collections
2. **Richer tagging schema** — additional optional fields on FieldNotes to make the corpus more useful for content and reasoning
3. **Studio conversation** — a small model conversation interface for capturing longer thinking, with the conversation transcript as the output

These are additions to the Phase 1 and Phase 2 build. Lines and the richer tagging schema should be built into Phase 1 from the start — retrofitting them later is harder than including them upfront. The studio conversation interface is Phase 2 but the data structure for it should be in place from Phase 1.

---

## 1. Lines

### What Lines are

Lines are active threads of investigation — ideas, projects, or conceptual connections that you're pursuing across time. The name comes from skateboarding: a line is a sequence of tricks connected into something that flows. Here, a Line connects disparate material — a painting, a voice memo, a B-roll clip, an episode concept, a written thought — into a single ongoing investigation.

Lines are different from tags. Tags describe what something is. Lines describe what something is part of — an active project of thinking that cuts across all collections and all mediaTypes.

A Line might run for weeks or years. It might connect a series of paintings to a MoP episode concept to some street photography to an observation about light. It might be as loose as "light on old surfaces" or as specific as "daguerreotype angle — Brandenburger Tor series." Lines stay open until you close them, and even closed Lines remain searchable.

### Lines collection schema

| Field | Type | Notes |
|---|---|---|
| `name` | Text | Short, memorable. The thing you'll recognise at upload time |
| `description` | Text (optional) | What you're exploring. One or two sentences. Can be added later |
| `status` | Select | `active` · `dormant` · `closed` |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |
| `recordOrigin` | Select | `user` · `small-model` (if suggested by system) |

### Where Lines appear

Lines can be attached to any record across all collections:

- FieldNotes — at upload or retroactively
- Paintings — on the painting record
- Art/Official sessions — on the session record
- Episodes — on the episode record
- Studio conversations — on the conversation record

A single piece of material can belong to multiple Lines.

### Creating a Line

Lines can be created from anywhere in the /studio interface — but critically, from the Upload tab without leaving the upload flow. At upload time the Lines field is a searchable dropdown of active Lines. If the Line you want doesn't exist, a "New Line" option creates it inline — name required, description optional, added immediately. The upload continues without interruption.

This is the most important design constraint for Lines: creating one must be faster than deciding not to.

### Lines in the weekly session

The small model prep for the weekly social session includes a Lines summary — which active Lines received new material this week, and whether any untagged material appears semantically connected to an active Line (via embedding similarity). Claude has this summary when helping work out what to post.

### Post-hoc connection surfacing

The nightly embedding job compares new FieldNotes transcripts and written notes against all active Lines descriptions and existing Line-tagged material. Candidate connections — "this clip appears related to your Line: light on old surfaces" — surface in the FieldNotes untagged view and in the weekly digest as suggestions for confirmation. The system proposes, you confirm.

---

## 2. Richer Tagging Schema

### Additional optional fields on FieldNotes

These fields are optional at upload — low friction, never blocking. They add texture that makes the corpus more useful for content assembly and small model reasoning over time.

| Field | Type | Options / Notes |
|---|---|---|
| `register` | Select (optional) | `exploratory` · `resolved` · `frustrated` · `excited` · `observational` — the emotional or tonal quality of the moment |
| `processStage` | Select (optional) | `early` · `mid` · `late` · `completed` — where in the making process this sits |
| `conceptualThread` | Select (optional) | `daguerreotype` · `wet-plate` · `aerial` · `digital` · `layering` · `light-quality` · `historical-angle` — the MoP conceptual threads. Expandable list, same pattern as Lines but specific to the MoP framework |
| `lines` | Relation → Lines (multiple) | Active Lines this material connects to |

### Why register matters

The transcript captures what you said. The register field captures how it felt. The small model can't reliably infer register from transcript content alone, but with it explicitly tagged, the weekly session can distinguish between exploratory material still in motion and resolved observations ready to be surfaced. It also becomes a meaningful dimension for the practice awareness layer — patterns in when and how you move between registers across a series.

### Why processStage matters

The timelapse pipeline already sequences photos chronologically, but process stage gives the reasoning layer something more meaningful than timestamp ordering. An early-stage voice memo and a late-stage observation about the same painting are different kinds of material even if they're close in time. For assembly sessions especially, knowing where in the process a clip sits helps Claude make better suggestions.

### ConceptualThread vs Lines

ConceptualThread is a fixed vocabulary for the MoP framework — the specific historical image-capture technologies and visual ideas that are the conceptual spine of the work. Lines are open-ended and personal, created and closed as thinking evolves. Both can be present on the same FieldNote. They serve different purposes: conceptualThread connects material to the public-facing intellectual framework; Lines connect material to your private working investigations.

---

## 3. Studio Conversation

### What it is

A conversation interface with the small model (Ollama on Hetzner) for capturing longer thinking. Not a reasoning session — the small model is not expected to reason well. The value is in your words, not the model's responses. The model is the interface that draws the thinking out, asks simple follow-up questions, and keeps the conversation moving. The transcript of the conversation is the output.

This serves two purposes:
- A richer context layer for all future model interactions — the accumulated transcripts become part of the corpus the small model and Claude draw from
- A testing and calibration tool — by talking to the small model directly you get a clear picture of what it is and isn't understanding from your thinking, which informs how much context to load for other tasks

### Interface

A simple chat interface in the /studio app. Accessed from a dedicated tab or from the Digest. No special session setup — just open it and start talking.

The small model is loaded with a minimal system prompt:
- Your name and practice context (one paragraph)
- The instruction to ask short follow-up questions and keep responses brief
- The active Lines and their descriptions
- Any recent FieldNotes transcripts that are semantically relevant to what you're writing (retrieved via pgvector before the conversation starts)

The model does not need to perform. It needs to listen and prompt.

### Conversation record schema

| Field | Type | Notes |
|---|---|---|
| `messages` | Array `{ role, content, timestamp }` | Full conversation transcript |
| `summary` | Text | Small model-generated summary after conversation ends. One paragraph |
| `lines` | Relation → Lines (multiple) | Which Lines this conversation connects to — assigned during or after |
| `relatedArtwork` | Relation → Artworks (optional) | If the conversation is about a specific painting |
| `relatedEpisode` | Relation → Episodes (optional) | If the conversation is about a specific episode |
| `createdAt` | DateTime | Auto |
| `recordOrigin` | Select | Always `user` for the conversation itself |

### Embeddings

The conversation summary gets a text embedding on completion — same pipeline as FieldNote transcripts. This makes the conversation searchable by meaning and surfaceable as context in future sessions.

The full transcript is stored but only the summary is embedded. This keeps the embedding corpus clean while preserving the full record.

### How it feeds the system

Conversation transcripts and summaries become part of the context layer loaded into the small model and Claude for other tasks. A storyboard session, an assembly session, or the weekly social session that has access to a month of studio conversation summaries is working from a much richer understanding of your current thinking than one that only has FieldNotes transcripts and Art/Official records.

Over time the conversation corpus becomes the most direct record of how your thinking evolves — more candid than Art/Official sessions, more sustained than voice memos, more searchable than notebooks.

---

## 4. Cross-Corpus Pattern Surfacing

### What it is

A periodic small model job that runs across the full FieldNotes and archive corpus looking for recurring patterns — visual motifs, conceptual themes, locations, materials, compositional approaches — that keep returning across different paintings, episodes, and time periods. Not triggered by a specific upload, just a background awareness pass that runs weekly.

The small model is not reasoning about these patterns — it is finding them via embedding similarity and frequency analysis. The output is a structured pattern report, not an interpretation.

### What it surfaces

- Visual motifs appearing across multiple paintings or B-roll clips — a particular quality of light, a compositional angle, a texture
- Conceptual themes recurring across voice memos and written notes across time
- Locations you keep returning to — in the field and conceptually
- Materials or techniques that cluster in certain periods
- Lines that are accumulating material faster than others — indicating active thinking even if not consciously directed

### Output

A pattern report added to the weekly digest — a short list of detected patterns with links to the material that exhibits them. Read-only, no action required. The value is awareness, not a task list.

Over time this becomes one of the most interesting outputs of the system — a record of what keeps returning in your practice that you might not have consciously noticed.

### Job schedule

Runs weekly, Sunday night before the digest compiles. Output is stored as a `PatternReport` record and surfaced in the digest.

---

## 5. Lines in the Weekly Digest

The weekly digest includes a dedicated Lines section — separate from the general untagged material summary.

**What it shows:**

| Item | Detail |
|---|---|
| Active Lines with new material | Which Lines received tagged material this week |
| Embedding-suggested connections | New FieldNotes not tagged to a Line but semantically close to one — shown as candidates for confirmation |
| Dormant Lines | Lines with no new material in the past month — surface for review, close or keep open |
| New Line suggestions | If the small model detects a cluster of related untagged material with no matching Line, it can suggest creating one — name proposed, you confirm or dismiss |

All suggestions are confirmable with one tap. Nothing is automatically added to a Line without explicit confirmation.

---

## 6. Practice Awareness — Pattern Layer

An extension of the Practice Awareness section in the core spec (Phase 2, item 8). The pattern layer adds a longer-horizon view derived from the full corpus rather than just recent activity.

**What gets surfaced over time:**

- Which Lines have run longest and accumulated the most material — indicating sustained preoccupations
- Register patterns across paintings and periods — were you mostly exploratory in a certain series, mostly resolved in another
- processStage distribution — do you document early stages or late stages more, does that correlate with anything
- ConceptualThread frequency — which MoP threads appear most in the corpus, which are underrepresented relative to the public-facing work
- Gaps — periods where studio conversation went quiet, where voice memos stopped, where a Line went dormant

This is not a productivity dashboard. It is a mirror of the practice over time. The value is noticing things about your own rhythm and preoccupations that are hard to see from inside the making.

Accessible from the Digest tab as a long-view section, separate from the weekly activity summary.

---

## Implementation Notes

**Lines** — build the collection and the upload-time dropdown in Phase 1 step 4 (Upload tab). The embedding-based suggestion pass can come later in the nightly job, but the data structure needs to be present from the start so nothing needs to be retrofitted.

**Richer tagging** — add the optional fields to the FieldNotes collection schema in Phase 1 step 2 (Payload collections setup). They're just additional optional columns — no impact on the existing processing pipeline.

**Studio conversation** — data structure (StudioConversations collection) in Phase 1 step 2 even if the interface isn't built until Phase 2. The conversation summary embedding pipeline is the same as FieldNotes — no new infrastructure.

---

*Studio App Specification Addendum · May 2026*
*bernardbolter.com · Addendum to studio-app-spec.md*
*Read alongside: studio-app-spec.md · small-model-architecture.md · brief-07-footage-pipeline.md*

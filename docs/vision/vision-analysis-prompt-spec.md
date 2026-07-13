# Vision Analysis Prompt Spec

**Status: FROZEN — version A-1.0**
**Date frozen: July 11, 2026**

This is the single source of truth for the vision analysis prompt. Any change to the prompt text requires a new version number (A-1.1, A-2.0, etc.) and a new entry in `vision-prompt-changelog.md` — never edit this file's frozen prompt in place.

---

## Why this exists

The `visionAnalyses[]` array on each Artwork record accumulates independent visual readings from different AI models over time. For those readings to be comparable — not just a pile of prose — every model has to answer the *same* prompt. This file is that fixed point.

## Schema constraint — read before touching the prompt

The Studio → Archive importer for vision analyses accepts exactly three fields per entry, nothing else:

```json
{
  "text": "string — full analysis prose",
  "model": "string — exact model version string",
  "date": "string — ISO date"
}
```

No `promptVersion` field exists in the importer or the Payload schema. This means the prompt must be designed so all its intent is captured as *instructions that shape the prose*, not as separate structured output — there is nowhere else for structured sub-fields to go. See `vision-prompt-changelog.md` for how prompt-version provenance is tracked outside the record itself.

## Blindness requirement — process rule, not a stored field

Every run of this prompt must happen in a session that has seen **only the image** — no artwork title, series, page content, or prior conversation about the work. Nothing in the schema enforces this after the fact, so it has to be protected at generation time:

- Always a fresh chat session, or a session where no other context about the artwork has been loaded.
- Attach the image directly (upload/drag-drop) rather than a URL, where possible — this also sidesteps tool-level restrictions on fetching image content from URLs.
- If blindness is ever broken (context leaked before the analysis ran), discard that run rather than recording it. A contaminated entry is worse than no entry — it looks like an independent witness but isn't one.

---

## Prompt A-1.0 (frozen)

```
Analyze this artwork image. Do not attempt to identify the artist, title, series, or specific location, even if you recognize them — describe only what is visually present.

Write a detailed visual analysis in flowing prose (multiple paragraphs are fine). Cover: composition and spatial structure, colour palette and tonal quality, mood and atmosphere, and formal/technical qualities apparent in the surface or medium.

If the image contains any visual cues suggesting multiple time periods, states, or moments coexisting within a single frame, describe those cues specifically and precisely rather than resolving or explaining them away.

Close with a brief note on anything in the image that resists confident description or categorization — do not force a resolution where none is visually evident.

Be specific and observational rather than interpretive. No judgments of quality or market value. Output prose only — no JSON, no headers, no bullet lists.
```

## Model string format

Use the exact version string, not the product family name — matches the `model` field the importer expects:

- `claude-sonnet-4-6` not `Claude`
- `gpt-4o` not `ChatGPT`
- `gemini-2.5-pro` not `Gemini`
- `deepseek-vl2` not `DeepSeek`

## Workflow

1. Fresh session, image only, no other artwork context.
2. Send the prompt above exactly as written.
3. Copy the resulting prose as-is into `text` — do not edit, trim, or paraphrase it afterward. If a reading needs correcting, add a new entry rather than modifying this one.
4. Build the import JSON per the confirmed shape (see `Studio → Archive` import docs) and submit.

## Do NOT

- Do not vary the prompt wording across models — that breaks comparability, which is the entire reason the array exists.
- Do not add extra fields to the import JSON — the importer only accepts `text`, `model`, `date`.
- Do not run this prompt in a session where artwork metadata has already been discussed or is visible in context.
- Do not hand-edit a previously recorded `text` entry — append a new one instead.
- Do not batch-run this across the archive automatically. Each analysis is a deliberate, manually triggered act.

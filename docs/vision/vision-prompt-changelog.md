# Vision Prompt Changelog

The Studio → Archive vision analysis importer stores only `text`, `model`, and `date` per entry — there is no `promptVersion` field in the schema. This file is the substitute record: it tracks which prompt version was in effect on any given date, so a `visionAnalyses[]` entry can be cross-referenced against this log by its `date` value if provenance is ever needed.

Do not delete or renumber past entries, even after a prompt is superseded. This is a historical log, not a current-state document.

---

## A-1.0

**Effective:** July 11, 2026 – ongoing

**Prompt file:** `vision-analysis-prompt-spec.md`

**Summary:** Blind visual analysis, prose output (no structured JSON — schema only accepts free text). Covers composition, palette, mood, formal/technical qualities. Instructs the model to describe temporal-coexistence cues precisely rather than resolving them, and to close with a note on anything that resists confident description.

**Why frozen at this wording:** Matches the exact three-field shape ( `text` / `model` / `date` ) accepted by the Studio → Archive importer, confirmed July 11, 2026. An earlier structured-JSON draft (seven discrete fields: palette, composition, subject_inventory, temporal_signals, mood, formal_qualities, unresolved) was designed before the importer's exact shape was confirmed and does not fit the schema — abandoned in favor of A-1.0.

---

<!--
Template for the next entry when the prompt changes:

## A-1.1 (or A-2.0 for a substantial rewrite)

**Effective:** [date] – [date prompt A-1.0 was retired, or "ongoing"]

**Prompt file:** [filename, if a new file is created — or note "same file, updated"]

**Summary:** [what changed and why]

**Why changed:** [reason for the revision]
-->

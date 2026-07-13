# Vision Analysis Prompt Spec — Moondream
## Per-shot-type prompting for the FieldNotes pipeline

*Companion to fieldnotes-worker-pipeline-spec.md. Moondream (1.8B, 4-bit quantized, CPU) needs short, blunt, single-question prompts — not elaborate instructions. This spec gives one prompt per shotType so keyframe tags are consistently structured and actually useful for sorting/timeline-building, rather than generic image captions.*

---

## 1. Why generic prompting fails here

A default "describe this image" prompt on a small quantized vision model produces prose like *"a man is standing near a large statue in what appears to be a park"* — technically accurate, useless for sorting. What the catalog needs instead is **short tag lists**, differentiated by what actually matters for that shot type: a VERSE frame cares about framing and legibility of the performer against the background; a DETAIL frame cares about which part of the artwork and the light; a CROWD frame cares about people and attention direction. Same model, different question, much more useful output.

---

## 2. Output format (all shot types)

Instruct the model to return **a short comma-separated tag list, 5–10 tags, lowercase, no full sentences.** This matches the existing `keyframes[].tags` field shape (array of short strings) and is what small models do best — they degrade fast on longer generative asks but hold up on short categorical ones.

Generic instruction appended to every prompt below:
> "Answer only with a short list of tags, 5 to 10 words or short phrases, comma-separated. No sentences."

---

## 3. Per-shotType prompts

### HOOK
*Purpose: is the opening statement legible? Framing check.*
> "List: is a person visible, are they facing the camera, is the background in focus or blurred, what is the lighting (bright/dim/golden/overcast), is text or a location landmark visible."

### VERSE
*Purpose: performer legibility against the artwork — this is the core timeline-building shot.*
> "List: person's position in frame (left/center/right), person's pose (standing/gesturing/moving), the artwork or artwork type visible behind them, how much of the artwork is visible (full/partial/cropped), lighting quality, any crowd or bystanders visible."

### ARRIVE
*Purpose: transit/establishing motion — used for edit transitions.*
> "List: direction of movement if visible, what is approaching or coming into frame, foreground/background separation, walking or stationary, any landmark visible."

### DETAIL
*Purpose: which part of the artwork, condition, light — feeds both the catalog and harvest-commentary pairing.*
> "List: which part of the object is shown (face/hands/texture/inscription/surface/other), material if identifiable (bronze/stone/paint/other), lighting direction and quality, any visible wear, patina, or damage, dominant colors."

### WIDE
*Purpose: the signature establishing composition — subject scale relative to environment.*
> "List: how small or large the person appears relative to the artwork or setting, overall setting type (park/street/museum exterior/gallery/urban), sky visible or not, time-of-day light cues, symmetry or framing notes."

### WALK
*Purpose: pure transit footage — mostly for pacing/b-roll cutaway use.*
> "List: setting type, motion blur present or not, people count visible, notable background elements, lighting."

### CROWD
*Purpose: bystander/audience read — social proof and reaction content.*
> "List: number of people visible (none/few/several/many), are they looking toward the subject or elsewhere, any visible reaction (smiling/filming/ignoring/stopped), setting density (empty/sparse/busy)."

### TALK
*Purpose: to-camera reflection — framing and mood read.*
> "List: is the person's face clearly visible, close-up or medium shot, background blurred or sharp, apparent mood from posture (relaxed/tired/animated/neutral), lighting quality."

### AMBIENT
*Purpose: static room-tone shots — mostly environmental, sound matters more than image here, but tag for reuse as b-roll.*
> "List: setting type, static or any movement in frame, lighting quality, dominant colors, any people present."

### BTS
*Purpose: behind-the-scenes — loosely tagged, mainly for retrieval later ("find the setup shots").*
> "List: what activity is visible (setup/walking/talking/adjusting equipment/other), people count, setting type, whether performance has started or not."

### photo (existing mediaType, not shotType — included for consistency with the already-running photo pipeline)
> "List: main subject, setting type, lighting quality, dominant colors, any text or landmark visible."

---

## 4. Practical notes for the worker implementation

- **One Moondream call per keyframe**, using the prompt matched to that clip's `shotType` field (already known from the slate parse — the vision call can run *after* the slate parser, so it always has the right prompt, not a generic default).
- If `shotType` is blank or `slateParseStatus: not-found` (parser failed), fall back to a generic prompt: *"List: main subject, setting, lighting, notable objects, 5 to 10 tags."* Better a plain tag list than no tags.
- **Keep prompts under ~40 words.** Longer instructions on a 1.8B quantized model tend to get partially ignored — the model answers the first clause and drops the rest. All prompts above are deliberately short for this reason.
- Store the raw returned tag string, split on commas, trimmed, lowercased, as the `tags` array — no further NLP cleanup needed at this stage.
- **Timing budget:** at ~15–30 sec/image on the CPU spec, a 90-second VERSE clip at the default 10-second keyframe interval produces ~9 keyframes → roughly 2–4.5 minutes of Moondream time for that one clip. Multiply by a week's shoot volume when estimating whether the 02:00–10:00 window has headroom.

---

*Written July 2026. Companion to fieldnotes-worker-pipeline-spec.md and shooting-plan-ai-pipeline.md.*

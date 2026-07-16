# Shooting Plan & AI Catalog Pipeline
## Rap Critic Training Season · July 2026

*Companion to social-ramp-rap-critic-program.md. Covers: the capture→catalog→timeline pipeline, spoken metadata conventions, and detailed shot lists for Episode 1 and the museum-visit reel.*

---

## 1. The pipeline

```
CAPTURE (phone + gimbal, spoken slates)
   → VPS (Ollama):
       vision model samples frames (~1 per 2–3 sec) → visual description per clip
       Whisper → full transcript per clip (slates, performance, b-roll voiceover)
       parser → reads slates from transcripts → catalog JSON
   → CATALOG (one JSON per clip, one manifest per shoot day)
   → CLAUDE SESSION (upload manifest + selects)
       → detailed edit timeline per episode
   → RESOLVE (cut from timeline)
```

**Core design principle: the voice is the metadata system.** Whisper transcribes everything, so anything spoken in a fixed format becomes machine-readable for free. Slates, quality verdicts, and b-roll annotations are all spoken, never written down in the field.

---

## 2. Conventions (lock these before shooting anything)

### 2.1 Spoken slate — start of EVERY clip
Format, spoken clearly, then one second of silence (clean cut point):

> **"Slate. Episode one. [SHOT TYPE]. Take two."**

- Always the word "Slate" first — the parser's anchor.
- Episode number as a word ("episode one"), not a digit — Whisper is more reliable on words.
- One second of silence after the slate before action begins.
- For non-episode material: "Slate. B-roll library." or "Slate. Museum reel, [museum name]."

### 2.2 Spoken verdict — end of every performance take
Immediately after the take, still rolling:

> **"Keeper."** / **"Scrap."** / **"Maybe."**

Three words only, controlled vocabulary. The parser flags the clip; nothing gets deleted, but the timeline session starts from keepers.

### 2.3 Shot-type vocabulary (say these exact words in slates)
| Spoken | Meaning |
|---|---|
| **HOOK** | The series open / tagline to camera |
| **VERSE** | The performance take (the rap) |
| **ARRIVE** | Walking toward / approaching the artwork |
| **DETAIL** | Close-ups of the artwork (silent OK) |
| **WIDE** | Establishing shot, location + artwork + you small in frame |
| **WALK** | Moving/transit footage |
| **CROWD** | Bystanders, reactions, environment with people |
| **TALK** | To-camera speech that isn't the hook (asides, reflections) |
| **AMBIENT** | 30+ sec of location sound, camera static |
| **BTS** | Behind the scenes, setup, stumbles worth keeping |

Ten types, no synonyms, no improvising new ones mid-shoot. The whole catalog's sortability depends on this list staying closed.

### 2.4 B-roll voiceover annotation
B-roll needs no live sound → talk over it WHILE filming:

> "Slate. Episode one. Detail. — This is the bronze hand from behind, afternoon light, good for the second verse line about reaching."

The annotation is transcribed, attached to the clip, and the audio track is discarded in the edit. Say what it is, what condition/light, and *what it might be for* if you already know. Fragments fine — this is exactly the harvest-commentary habit applied to video.

### 2.5 File handling
- Phone default filenames are fine — the slate carries identity, not the filename. (Renaming in the field is a failure point; don't.)
- One folder per shoot day on upload to VPS: `YYYY-MM-DD_e01_neptunbrunnen/`
- Never delete in the field. Scrap takes are training data for you and sometimes plot ("the stumbles are the content").

### 2.6 Catalog JSON (what the VPS should emit per clip)
```json
{
  "clip_id": "2026-07-18_e01_0007",
  "file": "VID_20260718_164233.mp4",
  "episode": "e01",
  "shot_type": "VERSE",
  "take": 2,
  "verdict": "keeper",
  "duration_sec": 94,
  "transcript": "...",
  "visual_description": "man in dark jacket performing before bronze fountain, golden light, two onlookers left of frame...",
  "annotation": null,
  "shoot_date": "2026-07-18",
  "location": "Neptunbrunnen"
}
```
Plus one `manifest.json` per shoot day listing all clips. **The manifest + transcripts is what comes back to Claude for the timeline session** — descriptions and text, not video files.

---

## 3. Episode 1 shot list — Sculpture (the opener)

Target: 60–90 sec reel. Shoot vertical 9:16 throughout. Redmi A3 on gimbal. Budget ~2 hours on site. Best light: golden hour or the flat light of overcast — avoid harsh midday.

**Order of operations on the day:**

| # | Slate | Shot | How | Takes |
|---|---|---|---|---|
| 1 | AMBIENT | 60 sec location sound, camera static on the statue | Before anything — the sound bed for the whole edit | 1 |
| 2 | WIDE | You tiny in frame, statue large, held 10 sec static | The season's signature opening frame — same composition every episode | 2–3 |
| 3 | HOOK | The full spoken open to camera: hook + tagline ("Freestyle is always looking for a topic..." → "...all 1.3 kilometers of it") | Mid shot, statue over your shoulder. This take also serves as the series trailer | 3–5, verdict each |
| 4 | ARRIVE | Walking toward the statue, gimbal following from behind, then circling to front | 20–30 sec, one continuous move | 2 |
| 5 | VERSE | The rap, full performance, framed mid with the statue | The core. Full takes even when they wobble — stamina data. Verdict after each | 3–5 |
| 6 | VERSE (wide) | One keeper-quality take repeated from the WIDE position | Gives the edit a second angle to cut between | 1–2 |
| 7 | DETAIL | 5–8 close-ups of the statue: face, hands, texture, patina, inscription — annotate each verbally | 10–15 sec each, slow gimbal moves | — |
| 8 | CROWD | Whatever human environment exists: passersby, someone stopping to watch | Opportunistic, grab throughout | — |
| 9 | TALK | One honest to-camera reflection after the last verse: how it felt, what failed | This is the training-arc plot line | 1–2 |
| 10 | BTS | Setup, warm-up mumbling, the walk away | Grab throughout | — |
| 11 | AMBIENT | 30 sec closing room tone | Insurance | 1 |

**Coverage rule of thumb:** for every minute of final reel, come home with ~10 minutes of footage. Episode 1 ≈ 15–20 clips, 20–30 min total.

**The two-angle VERSE trick (shots 5+6)** is what makes the edit look produced with one camera: cutting between mid and wide on the beat hides every trim.

---

## 4. Museum-visit reel shot list (the interleaved weekly format)

Target: 30–45 sec. Handheld (no gimbal rig inside — visitor posture), quiet voice or silent. Same slate discipline, spoken *sotto voce* — Whisper handles quiet speech well.

| # | Slate | Shot |
|---|---|---|
| 1 | ARRIVE | Exterior approach, entrance, ticket moment |
| 2 | WALK | Gallery transit — feet, frames passing, other visitors' backs |
| 3 | DETAIL | 3–5 works in passing, 5 sec each, annotated in a whisper |
| 4 | DETAIL (the one) | The work that stopped you — longer, slower, multiple distances. Annotate why |
| 5 | TALK | Outside afterward, one line to camera: why that one |
| 6 | AMBIENT | 30 sec of gallery hush (legally the room tone, aesthetically the point) |

The DETAIL annotations double as harvest commentary → same clips feed the pairing session. One visit, one catalog, two content layers.

---

## 5. Evergreen b-roll library (build continuously, slate "B-roll library")

A standing shopping list — grab whenever passing:
- East Side Gallery: the wall at different times of day, tourists photographing, the Pförtnerhaus from all sides, the Spree bank emptiness, murals in DETAIL
- Berlin transit: U-Bahn windows, walking shots, the routes between venues
- Studio: hands painting, beat-making, the guitar, print production
- Weather/light: the city in rain (the rain-plan episode may need it)

Every library clip annotated verbally. By September this is the connective tissue of the finale edit and the recap — collected at zero marginal cost.

---

## 6. The timeline session (back with Claude)

After the VPS processes a shoot:
1. Upload `manifest.json` (or paste it) + note anything the catalog missed
2. Claude reads transcripts + visual descriptions, selects from keepers, and builds the edit timeline: clip order by clip_id, in/out guidance from the transcripts, where the two VERSE angles alternate, where DETAIL cutaways land on which bars, caption text per voice principles
3. Timeline goes to Resolve as a cut list — the edit becomes assembly, not decision-making
4. Same session banks the caption + posting slot into the weekly plan

**What Claude needs per session:** the manifest, the episode number, and one line from Bernard on what the episode should feel like. Everything else is in the catalog.

---

## 7. First-shoot checklist (Episode 1)

- [ ] Beat made (minimal, hard, guitar-based) and in earbud or speaker decision made
- [ ] Hook + tagline memorized cold (it opens every episode — worth owning by heart)
- [ ] Slate vocabulary printed/phone-noted until it's reflex
- [ ] Phone storage cleared, battery + power bank, gimbal charged
- [ ] Statue chosen (Neptunbrunnen area / Marx-Engels-Forum / Schlossbrücke) and scouted for light + crowd at target hour
- [ ] VPS parser tested on ONE throwaway clip before the real shoot — slate → JSON proven end-to-end

---

*Written July 2026. Conventions in §2 are locked once Episode 1 ships — the catalog's value depends on them never drifting.*

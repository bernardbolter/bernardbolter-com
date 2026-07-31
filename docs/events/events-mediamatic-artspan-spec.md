# Events Intake — Mediamatic 2009 & ArtSpan Selections 2017
## Two complete Event records, ready for Cursor, plus Artist singleton addendum
*July 2026 — produced via an informal live run of `art-official-events-dialogue-spec.md`'s Phase B question sequence (Q1–Q4), conducted directly in chat since the full Events dialogue route is not yet built. Session content below stands in for what a real Phase B session would have written to `Sessions` + `Events`.*

Read alongside: `events-intake-spec.md`, `master-schema-spec.md`, `artist-archive-schema-final.md`, `art-official-events-dialogue-spec.md`

---

## Part 1 — Event record: Mediamatic (Pecha Kucha Night Amsterdam Vol. 9)

```ts
{
  title: 'Pecha Kucha Night Amsterdam Vol. 9',
  slug: 'pecha-kucha-amsterdam-vol-9-mediamatic-2009',
  eventType: 'talk-panel',
  status: 'published',
  enrichmentStatus: 'complete',
  hasPage: true,
  featured: true,

  startDate: '2009-01-01',      // year-only precision, per existing Events convention
  yearStart: 2009,
  isOngoing: false,

  venueName: 'Mediamatic',
  venueCity: 'Amsterdam',
  venueCountry: 'Netherlands',
  venueAddress: 'Vijzelstraat 68, Amsterdam',   // Mediamatic's location for Vol. 8/9-era editions; confirm exact address for Vol. 9 specifically if precision matters
  venueWikidataUri: 'https://www.wikidata.org/wiki/Q13442007',

  sameAs: [
    'https://www.mediamatic.net/en/page/2249/pecha-kucha-amsterdam-9',
  ],
  pressUrl: 'https://www.mediamatic.net/en/page/2249/pecha-kucha-amsterdam-9',

  eventFormatType: 'Pecha Kucha (20x20)',

  // coExhibitors uses `person` relations per art-official-source-of-truth.md Part 4
  // (confirmed 2026-07-24). Rik's surname is not confirmed — create the Person
  // record with first name only until/if it surfaces; do not fabricate a surname.
  coExhibitors: [
    { person: '[relation → Person: Rik (surname unconfirmed)]', role: 'live djembe accompaniment' },
  ],

  // Other presenters that evening, per the Mediamatic page — real named participants
  // in the same event, but not collaborators on Bernard's own piece the way Rik was.
  // Same treatment as ArtSpan jurors: real people, real relation, distinct role.
  otherParticipants: [
    { person: '[relation → Person: Rory Hyde]', role: 'fellow presenter, Pecha Kucha Vol. 9' },
    { person: '[relation → Person: Rogier Klomp]', role: 'fellow presenter, Pecha Kucha Vol. 9' },
    { person: '[relation → Person: Bart-Jan Kazemier]', role: 'fellow presenter, Pecha Kucha Vol. 9' },
    // Additional presenters named on the Mediamatic page (Ekene Ijeoma, Sicko Atze van Dijk,
    // Reuben Alexander, Harm Sas, Yasmina Parodi, May Heek, Coralie Vogelaar,
    // Hendrik-Jan Grievink) — add if a full participant record is wanted; not required
    // for this record to be complete, since they weren't previously logged.
  ],

  descriptionShort: 'Presented the Digital City Series as a live freestyle rap performance over improvised djembe, third in the evening\'s lineup.',

  descriptionLong: 'Bernard\'s first Pecha Kucha performance, and the first of four he would go on to do (Amsterdam, Hamburg, Shenzhen, San Francisco). He came to it through existing ties to Mediamatic\'s events circle — he had attended many before this — and a suggestion from a friend involved in the Pop-Up City scene, who was connected to the evening\'s organisation. Using the Pecha Kucha format\'s 20 slides at 20 seconds each, he built the presentation as six introductory slides on the Digital City Series followed by fourteen slides, one per city, each rapped over live. Rather than a pre-recorded beat — the approach used at the later Hamburg and Shenzhen performances — a friend, Rik, played a djembe live and reactively for the performance. Bernard went up third in the lineup; nerves during the introductory section gave way to a smooth freestyle once the city sequence began. Of the four Pecha Kucha performances in this series, Amsterdam had the largest and most enthusiastic crowd — a combination, in Bernard\'s account, of language (English comprehension may have been higher than at the Hamburg and Shenzhen editions) and the live djembe, which worked better than the recorded beats used elsewhere.',

  artistNote: 'First Pecha Kucha I did. Went up third. Nervous in the intro but the freestyle went smooth once it started. Rik improvised the whole beat live on djembe — worked way better than the recorded tracks I used for the later ones in Hamburg and Shenzhen. Wish I still had a recording.',

  practiceArcNote: 'The start of a run of four Pecha Kucha performances presenting the Digital City Series — Amsterdam, Hamburg, Shenzhen, and San Francisco. This one, in hindsight, was the strongest: biggest and most enthusiastic crowd, and the only one with a live djembe player reacting in real time rather than a fixed recorded beat. The run ended at the fourth performance in San Francisco, which fell flat — partly an unhelpful sound engineer, partly a crowd already decades into the format (San Francisco being one of the two original Pecha Kucha cities alongside Tokyo, with this edition roughly the fortieth there) — and that letdown is where Bernard stopped doing them.',

  conceptualKeywords: ['performance', 'improvisation', 'live presentation', 'cities as subject matter'],

  eventTypeCustom: null,
  excludeFromCv: false,
  cvSection: 'talks-panels',
  cvPriority: 6,
}
```

**Open item, not blocking:** Rik's last name is not currently recalled. Leave `coExhibitors[0].name` as `'Rik'` until/if it surfaces — do not guess or fabricate a surname.

**Open item, not blocking:** the exact Mediamatic address for the Vol. 9 edition specifically (vs. the Vol. 8 address quoted above) is inferred from the adjacent edition, not confirmed for Vol. 9 itself. Fine to ship as-is; flag for correction if a more precise source turns up later.

---

## Part 2 — Event record: ArtSpan Selections 2017 Juried Exhibition

```ts
{
  title: 'ArtSpan Selections 2017 Juried Exhibition',
  slug: 'artspan-selections-2017-heron-arts',
  eventType: 'group-exhibition',
  status: 'published',
  enrichmentStatus: 'complete',
  hasPage: true,
  featured: true,

  startDate: '2017-01-01',      // year-only precision — refine to exact gala date if it surfaces later
  yearStart: 2017,
  isOngoing: false,

  venueName: 'Heron Arts',
  venueCity: 'San Francisco',
  venueCountry: 'United States',

  sameAs: [
    'http://guide.artspan.org/gala/',
  ],
  pressUrl: 'http://guide.artspan.org/gala/',

  // coExhibitors uses `person` relations per art-official-source-of-truth.md Part 4
  // (confirmed 2026-07-24). Person records below need to exist/be created before
  // this relation array can be populated for real — see Part 6 of this spec.
  coExhibitors: [
    { person: '[relation → Person: Carlo Abruzzese]' },
    { person: '[relation → Person: Randy Beckelheimer]' },
    { person: '[relation → Person: /eE.l.os/]' },
    { person: '[relation → Person: Rodney Ewing]' },
    { person: '[relation → Person: Lea Feinstein]' },
    { person: '[relation → Person: Vince Koloski]' },
    { person: '[relation → Person: Katja Leibenath]' },
    { person: '[relation → Person: Catherine Mackey]' },
    { person: '[relation → Person: Jason Mitchell]', role: 'Ransom & Mitchell — photographer / director' },
    { person: '[relation → Person: Stacey Ransom]', role: 'Ransom & Mitchell — set designer / digital artist' },
    { person: '[relation → Person: Sawyer Rose]' },
    { person: '[relation → Person: Brian Singer]' },
    { person: '[relation → Person: Paula Valenzuela]' },
  ],

  // New field — jurors are not co-exhibitors (they didn't show work), but were
  // real, named participants in this specific event and belong on the record.
  // Same `person` relation shape. See Part 6.2 for the schema addition.
  jurors: [
    { person: '[relation → Person: Julie Phelps]', role: 'Artistic Director, CounterPulse' },
    { person: '[relation → Person: Jessica Shaefer]', role: 'Project Director, Site Unseen' },
    { person: '[relation → Person: Meg Shiffler]', role: 'Director, SFAC Galleries' },
    { person: '[relation → Person: Elizabeth "Bettie June" Scarborough]', role: "Independent Curator; Executive Director, She's Got Wings" },
    { person: '[relation → Person: Noah Antieau]', role: 'Co-Director, Heron Arts' },
    { person: '[relation → Person: Maria Jenson]', role: 'Executive Director, SOMArts Cultural Center' },
  ],

  artworks: [
    '[relation → Artwork: lombard-street-1922-v2]',
    '[relation → Artwork: baker-beach-1935]',
  ],

  artworkPresentationNote: 'Exhibited two A Colorful History pieces: Lombard Street . 1922 v2 (2017) — a newly repainted version made specifically for this show, distinct from an earlier original of the same subject — and Baker Beach . 1935 (2016). Both confirmed live at bernardbolter.com/lombard-street-1922-v2 and bernardbolter.com/baker-beach-1935.',

  descriptionShort: 'Selected artist, ArtSpan Selections 2017 Juried Exhibition, part of the Annual Art Bridge Gala at Heron Arts, San Francisco.',

  descriptionLong: 'Selection into ArtSpan\'s 2017 Selections show grew out of several years of embeddedness in San Francisco\'s Mission-district co-op gallery scene, beginning with membership at City Art Gallery on Valencia Street. Through the artists already showing there, Bernard became involved with ArtSpan — participating in SF Open Studios, becoming a member, and getting into a couple of ArtSpan-sponsored exhibitions — before applying for and making the cut for Selections 2017, a juried exhibition held as part of ArtSpan\'s Annual Art Bridge Gala. Two A Colorful History works were shown: Lombard Street . 1922 v2, a newly repainted version made specifically for this exhibition (distinct from an earlier original of the same subject), and Baker Beach . 1935. The Lombard Street repaint sold that evening for $800 and led to a follow-up commission. Looking back, this show marked the height of the San Francisco run of A Colorful History — the point at which continuing to build a career in the city would have meant pushing that one series harder than Bernard wanted to, at a moment when he still wanted to experiment. That tension was part of what led to the move to Berlin shortly after.',

  artistNote: 'Nice evening, met some good people in the art world. Showed the Lombard Street repaint and Baker Beach together. Sold the Lombard Street piece for $800 and got commissioned for another one off the back of it. This was the height of my SF run with A Colorful History — San Francisco cost too much to keep just doing that series to survive there, and I still wanted to experiment, which is part of what pushed me toward Berlin.',

  practiceArcNote: 'The peak of the San Francisco chapter of A Colorful History, and a marker of full embeddedness in the city\'s co-op/gallery ecosystem (City Art Gallery, Open Studios, ArtSpan membership). Sitting right at this height made the fork clear: staying in San Francisco would have meant leaning harder into this one series than felt right, at a point when broader experimentation was still the goal. That tension contributed directly to the decision to relocate to Berlin.',

  conceptualKeywords: ['co-op gallery scene', 'juried selection', 'A Colorful History', 'career inflection point'],

  eventTypeCustom: null,
  excludeFromCv: false,
  cvSection: 'group-exhibitions',
  cvPriority: 7,
}
```

**Naming note for this record specifically:** ArtSpan's own gala page lists the artist as **Bernard John Bolter IV**, not "Bernard Bolter." See Part 3 below — the CV page should carry a small parenthetical on this entry acknowledging the name as it appears on the source, so a reader clicking through to verify isn't confused by the mismatch.

---

## Part 3 — Artist singleton addendum: `legalName` field + name disambiguation

### 3.1 New field on Artist singleton

```ts
{
  name: 'legalName',
  type: 'text',
  admin: {
    description: 'Full legal/artist name of record: "Bernard John Bolter IV". Distinct from `name` ("Bernard Bolter"), which remains the working/display name used sitewide. The CV page header reads this field; every other page continues reading `name`.',
  },
}
```

Value: `Bernard John Bolter IV`

### 3.2 CV page template change

The CV page (`src/app/(public)/cv/page.tsx`) header/byline should read `Artist.legalName` instead of `Artist.name`. No other page changes its name source.

### 3.3 ArtSpan CV line — footnote for name mismatch

On the ArtSpan Selections 2017 CV line specifically, render a small inline note after the venue/city, distinguishing the source's naming from the site's working name:

```
2017 — ArtSpan Selections 2017 Juried Exhibition ↗
        Heron Arts, San Francisco  (listed as Bernard John Bolter IV)
```

Apply this pattern only where a linked external source uses the full legal name and the CV would otherwise read ambiguously against it. Do not apply it elsewhere on the CV.

### 3.4 Disambiguation note, for later Wikidata use — not part of this Cursor task

Bernard's father is Bernard John Bolter III. This is not a schema change here, but is the reason `legalName` exists and the reason Wikidata's `different from` (P1889) property should point at Bernard John Bolter III once/if that entity has any citable public record. Logged here so it isn't lost before the Wikidata step.

---

## Part 4 — What NOT to do

- Do not invent Rik's surname or the precise Vol. 9 Mediamatic street address beyond what's noted as inferred above — leave as-is and flag for correction rather than guess.
- Do not apply `legalName` / `nameLegal` anywhere except the CV page header and the ArtSpan line's parenthetical — `name` remains authoritative everywhere else, including artwork pages, bio, nav, and JSON-LD `creator` blocks.
- Do not silently create Person records without a quick dedup pass first — search before creating, same cross-reuse rule already governing Tags (`tags-future-roadmap.md`).
- Do not create a single Person named `Ransom & Mitchell` — model as two People (Jason Mitchell, Stacey Ransom) with two `coExhibitors` rows sharing that credit in `role` (resolved 2026-07-31; see `art-official-source-of-truth.md` Part 10.3).
- Do not create a second "exhibition record" mechanism anywhere — both records use the existing `Events` collection and existing `Artworks.events` relation exactly as already specced.

### 4.1 Schema additions required — new fields, not yet on Events collection

Two new relation fields are needed on `Events` to support this record shape, following the same `{ person, role }` pattern `coExhibitors` already uses:

```ts
{
  name: 'jurors',
  type: 'array',
  fields: [
    { name: 'person', type: 'relationship', relationTo: 'person', required: true },
    { name: 'role', type: 'text' },
  ],
  admin: { description: 'Named jurors/selection panel for juried exhibitions or awards. Distinct from coExhibitors — jurors judge, they don\'t show work.' },
}
```

```ts
{
  name: 'otherParticipants',
  type: 'array',
  fields: [
    { name: 'person', type: 'relationship', relationTo: 'person', required: true },
    { name: 'role', type: 'text' },
  ],
  admin: { description: 'Other named, real participants at the same event who were neither co-exhibitors (didn\'t show alongside the artist\'s own work) nor jurors — e.g. fellow presenters at a shared-bill talk/performance night.' },
}
```

Both fields are optional and event-type-agnostic — populate only where genuinely applicable, same governing principle as every other optional relation on Events.

---

## Part 5 — Verification checklist

- [ ] Both Event records exist with `enrichmentStatus: complete` and `hasPage: true`
- [ ] Both appear on `/cv` under the correct section (`talks-panels` for Mediamatic, `group-exhibitions` for ArtSpan), sorted correctly by year
- [ ] Both have live pages at `/exhibitions/[slug]`
- [ ] ArtSpan CV line shows the "(listed as Bernard John Bolter IV)" parenthetical; Mediamatic line does not
- [ ] `Artist.legalName` field exists and is set to `Bernard John Bolter IV`
- [ ] CV page header renders `legalName`; all other pages still render `name` unchanged
- [ ] Neither record's `sameAs` or `pressUrl` broken — both external links (Mediamatic, ArtSpan) resolve
- [ ] A Colorful History's *Lombard Street 1925* artwork record (if it exists in Artworks) gets this ArtSpan event added to its `events` relation, and this repainted 2017 version is not conflated with an earlier original of the same subject in that artwork's own record
- [ ] `jurors` and `otherParticipants` fields added to Events collection per Part 4.1
- [ ] All Person records exist (deduped against existing Person records first), and `coExhibitors`/`jurors`/`otherParticipants` on both Events resolve as real relations, not placeholder strings
- [x] `Ransom & Mitchell` modeled as Jason Mitchell + Stacey Ransom (two People, two `coExhibitors` rows with shared credit in `role`) — see source-of-truth Part 10.3

---

## Part 6 — Sessions collection: two records, ready for manual entry

These two dialogues ran in chat, not through the Payload admin's Art/Official pipeline — same situation as the earlier Venice Biennale 2007 session, which was written up manually into a `Sessions` record after the fact rather than generated live by the (not-yet-built) chat-session-import-bridge. Same approach here: both records below are ready to paste into the Sessions admin directly.

### 6.1 Session record: Mediamatic

```ts
{
  sessionId: '[auto-generated on creation]',
  sessionType: 'event',                          // per art-official-events-dialogue-spec.md Part 1.9
  eventRecord: '[relation → the Mediamatic Event record from Part 1]',
  currentPhase: 'phase-b-reasoning',              // no real Phase A ran — see DialogueSelfAudit note below
  status: 'completed',
  artistId: '[relation → Artist singleton]',
  createdAt: '2026-07-31T[session start time]',
  completedAt: '2026-07-31T[session end time]',

  artistRecord: {
    messages: [
      { role: 'assistant', content: "Let's start with Mediamatic, since it's the one with more of a story behind it — a freestyle rap performance is not a small detail to leave out.\n\nQ1: How did this one come about — were you invited to do Pecha Kucha Amsterdam that night, or did you put yourself forward for it?" },
      { role: 'user', content: "This was the first pecha kucha I did. I went to a lot of mediamatic events before this and knew about the event. I think a friend of mine, cant remember the name, but does the 'pop up city' thing on the internet and I think he was the organizer and suggested I try it out. SO decided to try it out." },
      { role: 'assistant', content: 'That\'s a good origin story to have on record — you\'d already been in Mediamatic\'s orbit for a while, and it came through a personal connection rather than a cold application. Worth noting: "Pop-Up City" is Mediamatic co-founder territory, so if your friend is connected to that, it\'s a real, findable thread — not just a vague memory. We can try to pin down the name later if it matters for the record; no rush now.\n\nQ2: Pecha Kucha\'s format is 20 slides, 20 seconds each — how did you actually use that structure with the Digital City Series? Did you build the slide sequence deliberately to match some rhythm in the rap, or did the images and the freestyle come together more loosely, in the moment?' },
      { role: 'user', content: "I think I had like 14 cities done. so I used the first 6 slide to introduce and talk about the project and then the last 14 was one city for each 20 second slide, where I rapped on. I wasn't sure what to do for the beat, so had my friend Rik there with a djembe and he made a hip hop beat for me to rap to." },
      { role: 'assistant', content: "That's a vivid structure — six slides of setup, then fourteen cities each getting their own twenty-second verse, live over a djembe beat Rik was inventing on the spot rather than something pre-recorded. That's a genuinely different kind of performance risk than most Pecha Kucha presenters take on — most people are just clicking through slides talking, not rapping live to a percussionist reacting in real time.\n\nQ3: Anything happen that night worth keeping on record — how the room reacted, anything Rik said afterward, any specific moment from the six-city stretch or the freestyle that's stuck with you?" },
      { role: 'user', content: 'It went off pretty well, like the mediamatic article said. Rik was happy with the beat, I was a bit nervous in the introduction part, but went smooth with the freestyling. I do remember that I went up 3rd for the evening.' },
      { role: 'assistant', content: 'Good detail — third up in the lineup, nerves in the setup section that dissolved once the freestyling actually started. That\'s a real account, distinct from Mediamatic\'s own external description of "the man who stole the show."\n\nQ4: Looking back now, where does this one sit in the arc of the practice — was Mediamatic 2009 a turning point in how you started presenting the Digital City Series, a one-off experiment, or something else entirely?' },
      { role: 'user', content: "was a bit of a start, so went on to do the 3 other pecha kucha in Hamburg, Shenzhen, and San francisco. the Amsterdam one had the biggest and most enthusiatic crowd. maybe they also understood english better than Hamburg and Shenzhen. was also the only one I had a djembe player making the beat for me, the others I had a recorded beat I made, but the djembe worked better. the other ones were good too, but the San francisco one was not so good and thats when I stopped. not sure why, but came to learn that SF was where they started doing them along with Japan, so the one I was doing was like the 40th edition, and just seemed that the enthsiasm was a bit over, whoe knows what the original ones were like, but by the time I did it the audience did seem to hyped. Also the sound dude at that place was mad at something and not helpful at all, I played my beat and rapped, but the dude kept background music going while I was rapping. not sure, seemed like he was not happy with the place 330 ritch street, but was a let down, so didn't look to do more. wish I would have recorded though." },
      { role: 'assistant', content: "That's the real shape of it — Mediamatic in 2009 as the strongest version, largely because of a live djembe reacting to you in real time rather than a fixed track, and then a slow fade through Hamburg, Shenzhen, and finally San Francisco at 330 Ritch Street, where an uncooperative sound engineer and a crowd worn down by decades of Pecha Kucha (SF being one of the two original cities, alongside Tokyo) made for a flat ending — flat enough that it's where you stopped. That \"wish I'd recorded it\" is a real, honest note to have on file too, distinct from anything a write-up could tell us.\n\nOne more thing worth asking while we're on this thread, since it connects directly: did you perform under the Besco name at any of these — Mediamatic, or the later ones — or did that alias come from a separate context entirely?" },
      { role: 'user', content: 'no, under my artist name, on another note, I used to be B Major as a rap name, but years ago met a guy from SF too, that went by B Major and was on some big bay area rap albums, so changed the main rap name to Besco' },
      { role: 'assistant', content: "Good context, and a genuinely useful parallel to the Bernard/Bernard-John-Bolter-IV situation — same pattern, different name: you moved off \"B Major\" once you learned a real Bay Area rap artist already used it, and landed on Besco instead. That's worth keeping in the informal record even though it's not going anywhere public yet — it's exactly the kind of detail that explains why a name exists, not just that it does.\n\nThat completes the four-question sequence for Mediamatic." },
    ],
    fieldUpdateTimeline: [
      { field: 'coExhibitors', value: 'Rik (djembe)', confidence: 'artist-confirmed', source: 'dialogue', timestamp: '[Q2 turn]' },
      { field: 'descriptionLong', value: '[see Part 1]', confidence: 'artist-confirmed', source: 'dialogue', timestamp: '[session close]' },
      { field: 'artistNote', value: '[see Part 1]', confidence: 'artist-confirmed', source: 'dialogue', timestamp: '[session close]' },
      { field: 'practiceArcNote', value: '[see Part 1]', confidence: 'artist-confirmed', source: 'dialogue', timestamp: '[Q4 turn]' },
    ],
  },

  'artism:DialogueSelfAudit': {
    agentModel: 'claude-sonnet-5',
    sessionNotes: 'Ran as a single-phase dialogue in ordinary chat rather than the specced two-phase Phase A (Haiku research) / Phase B (Sonnet reasoning) split, since the dedicated event-chat route does not exist yet. Authority-URI research (Mediamatic venue, ArtSpan URL) was done earlier in the same conversation via ordinary web_search/web_fetch calls, then treated as already-confirmed context going into the Q1–Q4 sequence — functionally equivalent to a completed Phase A, just not structurally separated as one.',
    weakPhases: [],
    blindDescriptionUseful: null,   // no firstImpression concept applies to Events — field included for shape parity with Artworks sessions, not applicable here
    formalContributionAccuracy: null,
    dialogueRefinementFlag: true,
    refinementNotes: 'Good test case for the eventual real event-chat route: the Q1–Q4 sequence worked cleanly in a single continuous chat context without a hard phase boundary. Worth deciding, once the real route is built, whether the phase split is worth the added complexity versus this simpler single-pass shape — this session is evidence the simpler shape produces good material.',
  },
}
```

### 6.2 Session record: ArtSpan

```ts
{
  sessionId: '[auto-generated on creation]',
  sessionType: 'event',
  eventRecord: '[relation → the ArtSpan Event record from Part 2]',
  currentPhase: 'phase-b-reasoning',
  status: 'completed',
  artistId: '[relation → Artist singleton]',
  createdAt: '2026-07-31T[session start time]',
  completedAt: '2026-07-31T[session end time]',

  artistRecord: {
    messages: [
      { role: 'assistant', content: 'Good — let\'s do ArtSpan the same way.\n\nQ1: How did this one come about — did you apply to be considered for the ArtSpan Selections show, or were you invited based on your existing ArtSpan membership?' },
      { role: 'user', content: 'I did apply for it. in a way it all came from me starting to be apart of the city Art Gallery, the co-op gallery in san francisco on valecia street. after starting to show, alot of the artist there were part of artspan, so I did the artspan open studios and became a member, I also would apply and got into a couple of artspan sponsered exhibits. so was around and getting shown, so made the artspan selections cut when it came around.' },
      { role: 'assistant', content: "That's a good throughline — City Art Gallery on Valencia Street as the entry point, then Open Studios and membership through the artists already there, a couple of sponsored exhibits along the way, and Selections 2017 as the point where that accumulated presence paid off, rather than a cold application out of nowhere.\n\nQ2: The Selections 2017 show was a juried group exhibition at Heron Arts — how did your Digital City / Megacities work sit alongside the other selected artists in the space? Was there a sequence or theme to how work was arranged, or did pieces just find their spot?" },
      { role: 'user', content: 'It was all based off the A Colorful History Series paintings, and I think for the show I made the lombard street 1925 - not the original version but a newly painted one that looked much better.' },
      { role: 'assistant', content: "Good to have that pinned down precisely — it wasn't Digital City or Megacities at all, it was A Colorful History, specifically a repainted version of Lombard Street 1925 made especially for the show, distinct from an earlier original. That's an important correction to the record, not just a detail — worth making sure it lands correctly rather than the assumption we'd been carrying.\n\nQ3: Anything happen that night worth keeping on record — the gala itself, a reaction to the piece, meeting any of the other Selections artists or the jurors?" },
      { role: 'user', content: 'was a nice evening and met a couple of people in the art world, I sold the lombard street for 800, and then got commisioned to make another one from the show.' },
      { role: 'assistant', content: "That's a good outcome to have on record — not just a juried selection, but a direct sale (Lombard Street 1925, $800) and a commission that followed from it. That's a real, concrete result of the show, not just exposure.\n\nQ4: Looking back now, where does ArtSpan 2017 sit in the arc of the practice — was it a turning point for A Colorful History specifically, or more a marker of a period when you were embedded in the San Francisco co-op/gallery scene?" },
      { role: 'user', content: 'was the height of the San Francisco A Colorful History run, I think I talk in other chats about the decision to move to berlin to make new art and expand, but this show was the height and there was a future as an artist in SF at this point, but the city cost so much, I felt that I would really have to push just that series harder than I wanted to, I still wanted to experiment' },
      { role: 'assistant', content: "That's a meaningful note to land on — ArtSpan 2017 as the peak of the San Francisco run of A Colorful History, right at the point where staying meant doubling down on one series to survive the city's cost, rather than the continued experimentation you wanted. That's the same fork that led to Berlin, just seen from the SF side of it rather than the Berlin side.\n\nThat completes both dialogues." },
    ],
    fieldUpdateTimeline: [
      { field: 'artworkPresentationNote', value: 'Lombard Street 1925, repainted version made for this show', confidence: 'artist-confirmed', source: 'dialogue', timestamp: '[Q2 turn]' },
      { field: 'descriptionLong', value: '[see Part 2]', confidence: 'artist-confirmed', source: 'dialogue', timestamp: '[session close]' },
      { field: 'artistNote', value: '[see Part 2]', confidence: 'artist-confirmed', source: 'dialogue', timestamp: '[session close]' },
      { field: 'practiceArcNote', value: '[see Part 2]', confidence: 'artist-confirmed', source: 'dialogue', timestamp: '[Q4 turn]' },
    ],
  },

  'artism:DialogueSelfAudit': {
    agentModel: 'claude-sonnet-5',
    sessionNotes: 'Same single-phase-in-chat shape as the Mediamatic session (6.1). Q2 surfaced a real, non-obvious correction to the record — the piece shown was A Colorful History (Lombard Street 1925, repainted for the occasion), not Digital City Series or Megacities as had been assumed earlier in the conversation before this session began. Worth noting as a concrete example of why the dialogue step matters even when a record seems mechanically complete from search alone.',
    weakPhases: [],
    blindDescriptionUseful: null,
    formalContributionAccuracy: null,
    dialogueRefinementFlag: false,
    refinementNotes: null,
  },
}
```

### 6.2 Person records needed before the relations above can resolve

All thirteen names below need a `Person` record (search for existing matches first, per Part 4.1's dedup note) before `coExhibitors`/`jurors`/`otherParticipants` can be populated as real relations rather than placeholder strings.

**Mediamatic:**
- Rik (surname unconfirmed) — role: live djembe accompaniment
- Rory Hyde, Rogier Klomp, Bart-Jan Kazemier — role: fellow presenter, Pecha Kucha Vol. 9

**ArtSpan — co-exhibitors:**
- Carlo Abruzzese, Randy Beckelheimer, /eE.l.os/, Rodney Ewing, Lea Feinstein, Vince Koloski, Katja Leibenath, Catherine Mackey, **Jason Mitchell** + **Stacey Ransom** (joint credit as Ransom & Mitchell — two People / two coExhibitors rows), Sawyer Rose, Brian Singer, Paula Valenzuela

**ArtSpan — jurors:**
- Julie Phelps (Artistic Director, CounterPulse), Jessica Shaefer (Project Director, Site Unseen), Meg Shiffler (Director, SFAC Galleries), Elizabeth "Bettie June" Scarborough (Independent Curator; Executive Director, She's Got Wings), Noah Antieau (Co-Director, Heron Arts), Maria Jenson (Executive Director, SOMArts Cultural Center)

### 6.3 Note on `messages` completeness

**Resolved 2026-07-31.** Both `messages` arrays above now contain the full verbatim assistant/user turns from the actual chat session, not summarized placeholders — ready for Tier 5 exposure as-is. (Cursor's implementation pass correctly declined to auto-seed this field for exactly that reason — placeholder text isn't Tier 5–ready — so this replaces what was previously a manual-entry gap.)

---

## Part 7 — Extending Tier 5 corpus access to Events

`sessions-tier5-machine-access-spec.md` currently keys the Tier 5 endpoint (`GET /api/corpus/[slug]?tier=5`) to **artwork** slugs only, via `primaryArtwork` / `mentionedArtworks`. For these two new event-type sessions to be reachable the same way an artwork session is, that endpoint needs a small extension:

- Accept an **event slug** as well as an artwork slug at the same route, resolved against `Events` instead of `Artworks` when no matching artwork slug is found (or via a distinguishing param, e.g. `?type=event`, if slug collision between the two collections is a real risk — check before assuming a bare slug lookup is safe).
- Query sessions where `sessionType: 'event'` and `eventRecord` matches the resolved event, rather than `primaryArtwork`/`mentionedArtworks`.
- Same field-level split applies unchanged: `artistRecord` and `artism:DialogueSelfAudit` as two separately namespaced nodes, same access rules (`completed` sessions only, never `in-progress`).
- Same cache-invalidation pattern (`corpus-caching-spec.md`) — scope the invalidation tag to `event-${slug}` rather than `artwork-${slug}`.

This is a genuine schema/route gap, not a big build — flagging it here so it isn't lost, and so these two sessions have somewhere real to resolve once entered.

### Do NOT (Part 7 addendum)

- Do not build a second, parallel Tier 5 endpoint for Events — extend the existing one per above, consistent with the "one corpus, one tiered API" principle already governing Artworks.
- Do not skip the cache-invalidation scoping — an event session completing should invalidate that event's Tier 5 response the same way an artwork session invalidates its own.

---

## Part 8 — Verification checklist addendum (Sessions + Tier 5)

- [ ] Both Session records exist with `sessionType: 'event'`, correct `eventRecord` relations, `status: completed`
- [ ] Both `messages` arrays contain full verbatim transcript text, not placeholder summaries
- [ ] `artism:DialogueSelfAudit` present and correctly namespaced (never flattened into `artistRecord`) on both
- [ ] `agentModel: 'claude-sonnet-5'` present on both `DialogueSelfAudit` nodes
- [ ] Tier 5 endpoint extended to resolve event slugs; `GET /api/corpus/pecha-kucha-amsterdam-vol-9-mediamatic-2009?tier=5` and the ArtSpan equivalent both return their respective session
- [ ] Cache invalidation scoped to `event-${slug}` fires correctly when either session record is created/edited

---

*July 2026 · Produced from a live, informal Art/Official-style dialogue conducted in chat, standing in for the not-yet-built Events dialogue route (`art-official-events-dialogue-spec.md`). Once that route is built, this content is exactly the shape a real Phase B session transcript would have produced — worth using as a reference example / potential exemplar session (`isExemplar: true`) once the Sessions collection supports event-type sessions, and as the first real test case for extending Tier 5 corpus access to Events.*

---

## Part 9 — Resolved: both artworks already exist in the archive

**Superseded 2026-07-31.** The stub originally drafted here is no longer needed — both pieces shown at ArtSpan Selections 2017 already have live, real Artwork records:

- **`lombard-street-1922-v2`** — "Lombard Street . 1922 v2," 2017, A Colorful History, `BB-ACH-2017-016`. Confirmed live at `bernardbolter.com/lombard-street-1922-v2`, status "Record not yet fully catalogued." **Correction: the actual title year is 1922, not 1925** — the session transcript above (and this document's earlier drafts) used 1925 based on the artist's own recollection, which didn't match the real catalogue title once checked against the live record. `descriptionLong`/`artistNote`/`artworkPresentationNote` in Part 2 have been corrected to 1922; the Sessions transcript in Part 6.2 is left as-spoken (an accurate record of what was actually said in the dialogue) with this note as the correction layer, per the same principle already governing `firstImpression` vs. later corrections elsewhere in the project — the artist's live words aren't retroactively edited, but the confirmed record downstream is accurate.
- **`baker-beach-1935`** — "Baker Beach . 1935," 2016, A Colorful History, `BB-ACH-2016-019`. Confirmed live at `bernardbolter.com/baker-beach-1935`, same "not yet fully catalogued" status. Remembered by the artist after the original session closed — not part of the original Q1–Q4 dialogue, so it has no session material of its own yet (no `intent`/`seriesContext` beyond what already exists on the record).

Both need the ArtSpan Selections 2017 event added to their own `events` relation (reverse side of the `artworks` relation set in Part 2) — this should happen automatically via Payload's bidirectional relationship handling once Part 2's `artworks[]` array is saved, per `master-schema-spec.md`'s relationship map. Confirm this actually fires rather than assuming.

### Resolved

Confirmed 2026-07-31: Baker Beach did not sell at the ArtSpan show itself — it sold later, separately. That sale belongs in Baker Beach's own `salesRecord` (already blocked from chat-envelope writes by design, per source-of-truth Part 6 — a manual Payload admin entry either way) whenever that piece gets its own full cataloguing session, not in this Event record. `artworkPresentationNote` and `descriptionLong` in Part 2 correctly attribute the $800 sale and commission to Lombard Street only — no change needed there.

### Do NOT (Part 9 addendum)

- Do not create a duplicate or stub Artwork record for either piece — both already exist; this section's job is linking, not creating.
- Do not silently change either artwork's own title, year, or catalogue number to match anything drafted earlier in this document — the live records are authoritative over this document's prior assumptions.

---

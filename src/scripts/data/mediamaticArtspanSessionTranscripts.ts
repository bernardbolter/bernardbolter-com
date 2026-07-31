/**
 * Verbatim event-enrichment session transcripts from
 * docs/events/events-mediamatic-artspan-spec.md Part 6.
 * Left as-spoken (including "1925" in ArtSpan Q2) — catalogue corrections live on the Event record.
 */

export const MEDIAMATIC_SESSION_ID = 'pecha-kucha-amsterdam-vol-9-mediamatic-2009-event-2026-07-31'

export const MEDIAMATIC_MESSAGES = [
  {
    role: 'assistant',
    content:
      "Let's start with Mediamatic, since it's the one with more of a story behind it — a freestyle rap performance is not a small detail to leave out.\n\nQ1: How did this one come about — were you invited to do Pecha Kucha Amsterdam that night, or did you put yourself forward for it?",
  },
  {
    role: 'user',
    content:
      "This was the first pecha kucha I did. I went to a lot of mediamatic events before this and knew about the event. I think a friend of mine, cant remember the name, but does the 'pop up city' thing on the internet and I think he was the organizer and suggested I try it out. SO decided to try it out.",
  },
  {
    role: 'assistant',
    content:
      'That\'s a good origin story to have on record — you\'d already been in Mediamatic\'s orbit for a while, and it came through a personal connection rather than a cold application. Worth noting: "Pop-Up City" is Mediamatic co-founder territory, so if your friend is connected to that, it\'s a real, findable thread — not just a vague memory. We can try to pin down the name later if it matters for the record; no rush now.\n\nQ2: Pecha Kucha\'s format is 20 slides, 20 seconds each — how did you actually use that structure with the Digital City Series? Did you build the slide sequence deliberately to match some rhythm in the rap, or did the images and the freestyle come together more loosely, in the moment?',
  },
  {
    role: 'user',
    content:
      "I think I had like 14 cities done. so I used the first 6 slide to introduce and talk about the project and then the last 14 was one city for each 20 second slide, where I rapped on. I wasn't sure what to do for the beat, so had my friend Rik there with a djembe and he made a hip hop beat for me to rap to.",
  },
  {
    role: 'assistant',
    content:
      "That's a vivid structure — six slides of setup, then fourteen cities each getting their own twenty-second verse, live over a djembe beat Rik was inventing on the spot rather than something pre-recorded. That's a genuinely different kind of performance risk than most Pecha Kucha presenters take on — most people are just clicking through slides talking, not rapping live to a percussionist reacting in real time.\n\nQ3: Anything happen that night worth keeping on record — how the room reacted, anything Rik said afterward, any specific moment from the six-city stretch or the freestyle that's stuck with you?",
  },
  {
    role: 'user',
    content:
      'It went off pretty well, like the mediamatic article said. Rik was happy with the beat, I was a bit nervous in the introduction part, but went smooth with the freestyling. I do remember that I went up 3rd for the evening.',
  },
  {
    role: 'assistant',
    content:
      'Good detail — third up in the lineup, nerves in the setup section that dissolved once the freestyling actually started. That\'s a real account, distinct from Mediamatic\'s own external description of "the man who stole the show."\n\nQ4: Looking back now, where does this one sit in the arc of the practice — was Mediamatic 2009 a turning point in how you started presenting the Digital City Series, a one-off experiment, or something else entirely?',
  },
  {
    role: 'user',
    content:
      "was a bit of a start, so went on to do the 3 other pecha kucha in Hamburg, Shenzhen, and San francisco. the Amsterdam one had the biggest and most enthusiatic crowd. maybe they also understood english better than Hamburg and Shenzhen. was also the only one I had a djembe player making the beat for me, the others I had a recorded beat I made, but the djembe worked better. the other ones were good too, but the San francisco one was not so good and thats when I stopped. not sure why, but came to learn that SF was where they started doing them along with Japan, so the one I was doing was like the 40th edition, and just seemed that the enthsiasm was a bit over, whoe knows what the original ones were like, but by the time I did it the audience did seem to hyped. Also the sound dude at that place was mad at something and not helpful at all, I played my beat and rapped, but the dude kept background music going while I was rapping. not sure, seemed like he was not happy with the place 330 ritch street, but was a let down, so didn't look to do more. wish I would have recorded though.",
  },
  {
    role: 'assistant',
    content:
      "That's the real shape of it — Mediamatic in 2009 as the strongest version, largely because of a live djembe reacting to you in real time rather than a fixed track, and then a slow fade through Hamburg, Shenzhen, and finally San Francisco at 330 Ritch Street, where an uncooperative sound engineer and a crowd worn down by decades of Pecha Kucha (SF being one of the two original cities, alongside Tokyo) made for a flat ending — flat enough that it's where you stopped. That \"wish I'd recorded it\" is a real, honest note to have on file too, distinct from anything a write-up could tell us.\n\nOne more thing worth asking while we're on this thread, since it connects directly: did you perform under the Besco name at any of these — Mediamatic, or the later ones — or did that alias come from a separate context entirely?",
  },
  {
    role: 'user',
    content:
      'no, under my artist name, on another note, I used to be B Major as a rap name, but years ago met a guy from SF too, that went by B Major and was on some big bay area rap albums, so changed the main rap name to Besco',
  },
  {
    role: 'assistant',
    content:
      "Good context, and a genuinely useful parallel to the Bernard/Bernard-John-Bolter-IV situation — same pattern, different name: you moved off \"B Major\" once you learned a real Bay Area rap artist already used it, and landed on Besco instead. That's worth keeping in the informal record even though it's not going anywhere public yet — it's exactly the kind of detail that explains why a name exists, not just that it does.\n\nThat completes the four-question sequence for Mediamatic.",
  },
] as const

export const MEDIAMATIC_SESSION_NOTES =
  'Ran as a single-phase dialogue in ordinary chat rather than the specced two-phase Phase A (Haiku research) / Phase B (Sonnet reasoning) split, since the dedicated event-chat route does not exist yet. Authority-URI research (Mediamatic venue, ArtSpan URL) was done earlier in the same conversation via ordinary web_search/web_fetch calls, then treated as already-confirmed context going into the Q1–Q4 sequence — functionally equivalent to a completed Phase A, just not structurally separated as one.'

export const MEDIAMATIC_REFINEMENT_NOTES =
  'Good test case for the eventual real event-chat route: the Q1–Q4 sequence worked cleanly in a single continuous chat context without a hard phase boundary. Worth deciding, once the real route is built, whether the phase split is worth the added complexity versus this simpler single-pass shape — this session is evidence the simpler shape produces good material.'

export const ARTSPAN_SESSION_ID = 'artspan-selections-2017-heron-arts-event-2026-07-31'

export const ARTSPAN_MESSAGES = [
  {
    role: 'assistant',
    content:
      "Good — let's do ArtSpan the same way.\n\nQ1: How did this one come about — did you apply to be considered for the ArtSpan Selections show, or were you invited based on your existing ArtSpan membership?",
  },
  {
    role: 'user',
    content:
      'I did apply for it. in a way it all came from me starting to be apart of the city Art Gallery, the co-op gallery in san francisco on valecia street. after starting to show, alot of the artist there were part of artspan, so I did the artspan open studios and became a member, I also would apply and got into a couple of artspan sponsered exhibits. so was around and getting shown, so made the artspan selections cut when it came around.',
  },
  {
    role: 'assistant',
    content:
      "That's a good throughline — City Art Gallery on Valencia Street as the entry point, then Open Studios and membership through the artists already there, a couple of sponsored exhibits along the way, and Selections 2017 as the point where that accumulated presence paid off, rather than a cold application out of nowhere.\n\nQ2: The Selections 2017 show was a juried group exhibition at Heron Arts — how did your Digital City / Megacities work sit alongside the other selected artists in the space? Was there a sequence or theme to how work was arranged, or did pieces just find their spot?",
  },
  {
    role: 'user',
    content:
      'It was all based off the A Colorful History Series paintings, and I think for the show I made the lombard street 1925 - not the original version but a newly painted one that looked much better.',
  },
  {
    role: 'assistant',
    content:
      "Good to have that pinned down precisely — it wasn't Digital City or Megacities at all, it was A Colorful History, specifically a repainted version of Lombard Street 1925 made especially for the show, distinct from an earlier original. That's an important correction to the record, not just a detail — worth making sure it lands correctly rather than the assumption we'd been carrying.\n\nQ3: Anything happen that night worth keeping on record — the gala itself, a reaction to the piece, meeting any of the other Selections artists or the jurors?",
  },
  {
    role: 'user',
    content:
      'was a nice evening and met a couple of people in the art world, I sold the lombard street for 800, and then got commisioned to make another one from the show.',
  },
  {
    role: 'assistant',
    content:
      "That's a good outcome to have on record — not just a juried selection, but a direct sale (Lombard Street 1925, $800) and a commission that followed from it. That's a real, concrete result of the show, not just exposure.\n\nQ4: Looking back now, where does ArtSpan 2017 sit in the arc of the practice — was it a turning point for A Colorful History specifically, or more a marker of a period when you were embedded in the San Francisco co-op/gallery scene?",
  },
  {
    role: 'user',
    content:
      'was the height of the San Francisco A Colorful History run, I think I talk in other chats about the decision to move to berlin to make new art and expand, but this show was the height and there was a future as an artist in SF at this point, but the city cost so much, I felt that I would really have to push just that series harder than I wanted to, I still wanted to experiment',
  },
  {
    role: 'assistant',
    content:
      "That's a meaningful note to land on — ArtSpan 2017 as the peak of the San Francisco run of A Colorful History, right at the point where staying meant doubling down on one series to survive the city's cost, rather than the continued experimentation you wanted. That's the same fork that led to Berlin, just seen from the SF side of it rather than the Berlin side.\n\nThat completes both dialogues.",
  },
] as const

export const ARTSPAN_SESSION_NOTES =
  'Same single-phase-in-chat shape as the Mediamatic session (6.1). Q2 surfaced a real, non-obvious correction to the record — the piece shown was A Colorful History (Lombard Street 1925, repainted for the occasion), not Digital City Series or Megacities as had been assumed earlier in the conversation before this session began. Worth noting as a concrete example of why the dialogue step matters even when a record seems mechanically complete from search alone. Post-session catalogue check corrected the subject year to 1922 (slug lombard-street-1922-v2); Baker Beach . 1935 was also confirmed as shown.'

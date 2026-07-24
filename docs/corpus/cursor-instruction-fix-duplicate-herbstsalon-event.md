# Cursor Task: Fix Duplicate Herbstsalon Event Records

## Problem

The CV currently shows the same exhibition twice, as two separate stub Events records:

1. **"Herbstsalon, Komm ins Offene!"** — year 2022, venue "Zwitschermachine"
2. **"Herbstsalon, Komm ins Offene!"** — year 2023, venue "Pallaseum"

Same show, entered twice, with drifted venue spelling and a wrong year on one of them. No `search_events`-style duplicate check existed when these were created, so nobody caught it at intake.

## Confirmed correct facts (from artist session, July 24 2026)

- **Title:** Herbstsalon im Frühling
- **Dates:** March 31 – April 24, 2022 (`startDate: "2022-03-31"`, `endDate: "2022-04-24"`)
- **Venue:** ZWITSCHERMASCHINE (Palladium Studios, 5th floor, Pallasseum), Berlin, Germany
- **Event type:** group-exhibition
- **Source:** http://herbstsalon.berlin/

## Instructions

1. **Find both existing records** in the Events collection matching title "Herbstsalon, Komm ins Offene!" (or close variants).
2. **Identify which one to keep:** the **2022 / "Zwitschermachine"** record is the closer match to the confirmed facts above — keep and update this one. Do not create a new third record.
3. **Update the kept 2022 record in place** with:
   - `title`: "Herbstsalon im Frühling"
   - `startDate`: "2022-03-31"
   - `endDate`: "2022-04-24"
   - `yearStart`: 2022
   - `venueName`: "ZWITSCHERMASCHINE (Palladium Studios, 5th floor, Pallasseum)"
   - `venueCity`: "Berlin"
   - `venueCountry`: "Germany"
   - `sameAs`: ["http://herbstsalon.berlin/"]
   - `coExhibitors`: Beatrice Jugert, Zoltan Labas, Leïla Benbaouche, Carsten Lisecki, Hannah Becher, Hartmut Jahn, Lorena Terzi, Nahed Mansour, Giò di Sera, Laura Lukitsch, Michael Schmacke, Inga Kat Coleman, Regine Torbjørnsen, Cirenia Jahn Fernández, Niklas Fanelsa (each as `{ name: "..." }`)
   - `artworks`: relation to `almadinat-alearabia` and `deutsche-stadt` (do NOT add Yugograd or the Turkish-cities piece yet — add each only once its own artwork session has been reasoned)
   - `artworkPresentationNote`: "Bernard's contribution was one 'stop' within TRACES | perceptions | reflections, a multi-artist walking piece weaving each artist's own reflections with video documentation of the neighborhood. His stop was titled BLICK OBEN ('View From Above'), presenting Almadinat Alearabia."
   - `enrichmentStatus`: "partial"
4. **Delete the 2023 / "Pallaseum" duplicate record entirely.** Do not archive or leave it live — it should not appear on the CV at all once this is done.
5. **Verify after the change:** the CV should show exactly one "Herbstsalon im Frühling" line, dated 2022, and it should be the corrected record — not a fresh third slug.

## Do NOT

- Do NOT create a new Events record/slug for this — fix the existing 2022 record in place.
- Do NOT leave both old records live "just in case."
- Do NOT add Yugograd or the Turkish-cities piece to `artworks[]` yet — they haven't been reasoned over in their own sessions.

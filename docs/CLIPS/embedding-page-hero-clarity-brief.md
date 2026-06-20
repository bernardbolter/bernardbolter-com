# Embedding Page — Hero Zone Clarity Fix

*Addendum to `embedding-page-cursor-brief.md`. Fixes a real ambiguity: at a glance, the embedding page currently reads too much like the artwork's main page.*

---

## The problem

Live screenshot review showed: title, year, medium, then straight into "Similar works" — structurally near-identical to the artwork page's own opening. Someone arriving via a shared link, without clicking through from the artwork page itself, could briefly mistake this for the artwork's primary page.

## The fix

Wrap the existing image + title + year + medium block in a tinted background zone with a small label above it identifying the page. Full-size artwork image stays exactly as it is today — no shrinking, no thumbnail treatment. Only the surrounding zone and the added label change.

### Structure

```
[zone: background #f7f6f3, border-radius 4px, padding ~1.2rem]
  
  eyebrow label: "Visual embedding · not the artwork page"
    - font-size: 10px, font-weight: 700, uppercase, letter-spacing: 0.06em
    - color: the new $ui-filter-active amber token (#FBE3C4 family — use the
      same warm accent color established for the active-filter indicator;
      check design-system.md for the exact token name added there) —
      actually render the TEXT in a readable darker amber/warm tone, not
      the pale #FBE3C4 fill itself (#FBE3C4 was speced for a background
      tint behind an icon glyph, not for body text — use a darker stop in
      the same hue family so it's legible at 10px; do not reuse the literal
      hex value verbatim for text color)
    - margin-bottom: ~0.9rem

  [full-size artwork image — unchanged from current implementation]
  margin-bottom: ~1rem

  artwork title — same typographic treatment already in use
  margin-bottom: ~0.15rem

  year · medium — same typographic treatment already in use

[/zone]

[eyebrow, OUTSIDE the zone, marking the start of the page's unique content]
"This work's visual embedding"
  - font-size: 10px, font-weight: 700, uppercase, letter-spacing: 0.06em
  - color: muted gray (consistent with existing "Similar works" label color)
  - padding-top: ~1.75rem, padding-bottom: ~1rem

[Similar works section follows, unchanged]
```

### Notes

- The zone background (`#f7f6f3`) is a new, very light neutral tint — distinct from both the page's white background and the long-form text's existing `#efeee9` panel further down the page. Confirm it doesn't read as the same tone as that lower panel; the two should feel like different things (one is "you're on this page," the other is "now read this essay").
- Do not add a border around the zone — background tint alone is sufficient, consistent with the site's generally flat, borderless panel language elsewhere (Object record panel, etc.)
- This fix applies **only** to the embedding page (`/[slug]/embedding`). Do not touch the main artwork page's hero treatment — it stays exactly as is.

## Do NOT

- Do not shrink or thumbnail the artwork image — full size, as already implemented
- Do not reuse `#FBE3C4` verbatim as text color — that exact value was speced as a light background tint for the filter-active icon indicator; for legible small text here, use a darker stop in the same amber hue family
- Do not make the two background tints (`#f7f6f3` hero zone vs. `#efeee9` long-form text panel) visually identical — they should read as two different zones, not one continuous block

## Verification checklist

- [ ] Hero zone (eyebrow + image + title + year/medium) sits on a distinct light tint, visually separated from the white page background
- [ ] "Visual embedding · not the artwork page" label is legible, uses a readable amber/warm tone (not the pale `#FBE3C4` fill)
- [ ] Artwork image renders at full size, unchanged from current implementation
- [ ] Second eyebrow ("This work's visual embedding") appears between the hero zone and the Similar Works section
- [ ] Hero zone tint and the long-form text panel tint are visually distinguishable from each other
- [ ] Main artwork page (`/[slug]`) is completely unaffected by this change

# Cursor Brief — Provenance Depth & Right Column Finalization
## bernardbolter.com · Artwork Page · Implementation Brief #3
*June 2026 · Bernard Bolter × Claude*

---

## Read first

- `provenance-depth-finalization-addendum.md` — the full spec this brief implements
- Test data: `__fixture-gates-iii` (unique original, single-tier provenance) and `__fixture-basel-dcs` (DCS work — needs schema update for the multi-copy original treatment, see Step 1 below)

This brief has four parts. Do each in order and commit separately.

---

## Step 0 — Tonal background system

Do this first — it's a styling foundation the other steps render on top of, and it's independent of the schema/content changes in Steps 1–4.

**Remove any grey panel background from `Layer3ArtistAccount.tsx`** — the prose column should sit on plain white (`var(--color-background-primary)`), no panel wrapper.

**`Layer1ObjectRecord.tsx`** — change its panel background to:
```css
background: #efeee9;
```

**`Layer4History`'s exhibition history block** — change its panel background to:
```css
background: #ece9e2;
```

**`Layer2StatusAndProvenance.tsx`'s Status & Ownership block** — remove its current grey/panel background entirely. It becomes:
```css
background: #ffffff;
border: 0.5px solid rgba(0,0,0,0.09);
border-left: 3px solid [series colour]; /* keep the existing accent, now on a white card instead of a grey panel */
border-radius: var(--border-radius-lg);
padding: 1rem 1.1rem;
```

**`EditionTierRegistry.tsx`** — confirm it already uses the white-bordered-card treatment from the earlier addendum; no change needed here, just verify it's actually rendering white, not inheriting a grey from a parent wrapper.

**Hero-to-data divider** — in `ArtworkPage.tsx`, above the two-column grid, add:
```css
border-top: 1.5px solid var(--color-border-secondary);
padding-top: 1.4rem;
```

### Test against fixtures

- Confirm Layer3's prose has no visible panel background on both fixture pages
- Confirm Object record and Exhibition history read as two distinct, slightly different greys, both clearly darker than white
- Confirm Status & Provenance and Editions both read as white cards, distinguishable from the grey panels
- Confirm the divider above the data columns is visibly heavier than the hairlines used between sections within the data columns

Commit: `style: establish tonal background hierarchy across right column and prose`

---



In the Artwork collection's `ownershipRegistry` array field, add:

```ts
{
  name: 'isOriginalTier',
  type: 'checkbox',
  defaultValue: false,
  admin: {
    description: 'True only for DCS/Megacities works where this tier (3+1AP) IS the original artwork, not a print of it. Renders in Status & Provenance instead of Editions.',
  },
}
```

Update `__fixture-basel-dcs`'s seed data: set `isOriginalTier: true` on the "Original edition" tier (the 3+1AP one), leave it unset/false on "Collectors print" and "Small print". Re-run the Basel seed after this schema change.

Commit: `schema: add isOriginalTier flag to ownershipRegistry tiers`

---

## Step 2 — Provenance claims display (replaces the single-line summary)

In `Layer2StatusAndProvenance.tsx`, replace the current "Provenance: [partially/fully] documented" single line with a full claims list, rendered from `provenanceConfidenceLayer`.

**Filter claims into two groups before rendering:**
- Prominent: `confidenceLevel === 'documented-fact'` or `'credible-inference'`
- Demoted: `confidenceLevel === 'institutional-assertion'`
- Excluded entirely (never rendered): `confidenceLevel === 'speculation'`

**Prominent list** — always rendered in full, never collapsed:

```tsx
<p className="...">Provenance record</p>
{prominentClaims.map(claim => (
  <div key={claim.claim} style={{display:'flex', gap:'0.55rem', alignItems:'baseline'}}>
    {claim.confidenceLevel === 'documented-fact' ? (
      <span style={{width:6, height:6, borderRadius:'50%', background:'var(--color-text-primary)', flexShrink:0, marginTop:5}} />
    ) : (
      <span style={{width:6, height:6, borderRadius:'50%', border:'1.5px solid var(--color-text-tertiary)', background:'transparent', flexShrink:0, marginTop:4}} />
    )}
    <p style={{
      fontSize:13, lineHeight:1.5, margin:0,
      ...(claim.confidenceLevel === 'credible-inference' ? {color:'var(--color-text-secondary)', fontStyle:'italic'} : {})
    }}>
      {claim.claim}
      {claim.confidenceLevel === 'credible-inference' && (
        <span style={{fontStyle:'normal', opacity:0.7}}> — inferred</span>
      )}
    </p>
  </div>
))}
```

**Legend** — render once below the list, only the marker types actually present:

```tsx
<p style={{fontSize:11, color:'var(--color-text-tertiary)', marginTop:'0.6rem'}}>
  {hasDocumentedFact && '● Documented fact'}
  {hasDocumentedFact && hasCredibleInference && '   '}
  {hasCredibleInference && '○ Credible inference'}
</p>
```

**Demoted "Additional records" sub-section** — only if `institutional-assertion` claims exist:

```tsx
{demotedClaims.length > 0 && (
  <div style={{marginTop:'1rem', opacity:0.6}}>
    <p style={{fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--color-text-tertiary)', marginBottom:'0.4rem'}}>
      Additional records
    </p>
    {demotedClaims.map(claim => (
      <p key={claim.claim} style={{fontSize:11, color:'var(--color-text-tertiary)', lineHeight:1.5, margin:0}}>
        {claim.claim}
      </p>
    ))}
  </div>
)}
```

`speculation`-level claims are filtered out before any of the above renders — confirm they never appear in either array.

### Test against fixtures

- `__fixture-gates-iii`: 3 claims, all `documented-fact` → 3 solid-dot rows, legend shows only "● Documented fact", no demoted section
- `__fixture-basel-dcs`: currently has 2 claims (1 `documented-fact`, 1 `credible-inference`) — update the seed to also add one `institutional-assertion` claim to test the demoted section, e.g. `{ claim: "1/3 exhibited at Kunsthalle Basel, 2015", evidenceBasis: "Institution loan record", confidenceLevel: "institutional-assertion" }`

Commit: `feat: surface individual provenance claims with confidence markers`

---

## Step 3 — Multi-copy original tier in Status & Provenance

When an artwork has an `ownershipRegistry` tier with `isOriginalTier: true`, render it inside `Layer2StatusAndProvenance`, above the provenance claims list from Step 2. This replaces whatever single-location headline logic currently runs for these specific works (DCS/Megacities originals don't have one `currentLocation` — they have up to `editionSize + apCount` locations).

```tsx
{originalTier && (
  <>
    <p style={{fontSize:15, fontWeight:500, margin:'0 0 0.3rem'}}>
      Original edition — {originalTier.editionSize + originalTier.apCount} copies
    </p>
    <p style={{fontSize:12, color:'var(--color-text-secondary)', marginBottom:'1.2rem', lineHeight:1.5}}>
      An edition of {originalTier.editionSize} plus {originalTier.apCount} artist's proof{originalTier.apCount > 1 ? 's' : ''}. Each numbered copy is a complete original.
    </p>

    {originalTier.copies
      .filter(c => !c.isArtistProof || allNumberedClaimed(originalTier))
      .map(copy => (
        <div key={copy.copyNumber} style={{marginBottom:'1.2rem', paddingBottom:'1.2rem', borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
          {copy.claimStatus === 'claimed-confirmed' || copy.claimStatus === 'artist-held' || copy.claimStatus === 'sold-secondary' ? (
            <>
              <p style={{fontSize:13, fontWeight:500, margin:'0 0 0.4rem'}}>
                {copy.copyNumber} — {copy.isArtistProof ? (copy.claimStatus === 'sold-secondary' ? 'Sold by the artist' : 'Held by the artist') : copy.owner}
              </p>
              {/* per-copy provenance claims render here using the same marker pattern as Step 2, if the copy has its own claims data */}
            </>
          ) : (
            <>
              <p style={{fontSize:13, fontWeight:500, margin:0, color:'var(--color-text-tertiary)'}}>
                {copy.copyNumber} — Unclaimed
              </p>
              <p style={{fontSize:12, color:'var(--color-text-tertiary)', marginTop:'0.4rem'}}>
                Do you own this copy? <a href={`/contact?claim=${slug}&copy=${copy.copyNumber}`}>Claim it →</a>
              </p>
            </>
          )}
        </div>
      ))}
  </>
)}
```

Note the AP filter (`!c.isArtistProof || allNumberedClaimed(...)`) reuses the existing suppression logic already built for the Editions accordion — do not write a second implementation of that rule, import/reuse the same helper function if one already exists from the prior brief.

**Critical: unclaimed copies in this block ARE shown** (unlike the Editions accordion where unclaimed copies are always hidden). This is intentional — flag it clearly in code comments so a future edit doesn't "fix" this into matching the Editions accordion's hide-unclaimed behavior.

### Remove the original tier from EditionTierRegistry

In `EditionTierRegistry.tsx`, filter out any tier where `isOriginalTier === true` before rendering — that tier now lives only in Status & Provenance.

### Test against fixtures

- `__fixture-basel-dcs`: "Original edition" tier (now flagged `isOriginalTier: true`) should disappear from the Editions accordion and appear instead in Status & Provenance, showing 1/3 claimed with a name, 2/3 and 3/3 as visible "Unclaimed" rows with claim links, AP entirely absent (2 of 3 numbered still unclaimed)
- `__fixture-gates-iii`: has no `isOriginalTier` tier at all (it's a unique painting, not a DCS/Megacities work) — confirm Status & Provenance still renders its normal single-location headline + claims list, unaffected by this change

Commit: `feat: render original-edition tier as multi-copy provenance block`

---

## Step 4 — Section reorder, remove Documentation & media, add record meta footer

**Reorder** `Layer2StatusAndProvenance`'s rendered output (and `Layer4History`'s exhibition piece, now rendered earlier) to:

1. Object record (unchanged, separate component)
2. Status & provenance (Steps 2–3 above)
3. Exhibition history — move this above Editions
4. Editions (`EditionTierRegistry`, now excluding `isOriginalTier` tiers per Step 3)
5. External links
6. Record meta footer (new)

**Remove Documentation & media entirely** — delete the block rendering `documentationVideoUrl` and the AR-experience link from the right column. Confirm no orphaned code or unused imports remain.

**Add the `↗` indicator** to exhibition entries where `event.hasPage === true`:

```tsx
{year} — {event.hasPage ? (
  <Link href={`/events/${event.slug}`}>{event.title} ↗</Link>
) : (
  <span>{event.title}</span>
)}
```

**Add the record meta footer**, new small component or inline block at the very bottom of the right column:

```tsx
<div style={{borderTop:'0.5px solid var(--color-border-tertiary)', paddingTop:'0.85rem', display:'flex', flexDirection:'column', gap:'0.4rem'}}>
  {artwork.catalogueNumber && (
    <p style={{fontSize:11, color:'var(--color-text-tertiary)', margin:0}}>{artwork.catalogueNumber}</p>
  )}
  {artwork.reasoningStatus && (
    <p style={{fontSize:11, color:'var(--color-text-tertiary)', margin:0}}>{reasoningStatusCopy[artwork.reasoningStatus]}</p>
  )}
  <p style={{fontSize:11, color:'var(--color-text-tertiary)', margin:0}}>
    Last updated {formatMonthYear(artwork.updatedAt)}
  </p>
</div>
```

Reuse the existing `reasoningStatusCopy` mapping from `ReasoningStatusBadge.tsx` rather than redefining it.

**Remove `ReasoningStatusBadge` from `Layer3ArtistAccount.tsx` entirely** — its only remaining home is the new footer.

### Test against both fixtures

- Confirm full right column order on both `/preview/artwork/__fixture-gates-iii` and `/preview/artwork/__fixture-basel-dcs`
- Confirm no Documentation & media section appears on either page
- Confirm the reasoning status sentence appears exactly once per page (footer only, not also at the bottom of Layer3)
- Confirm catalogue number and last-updated date render correctly

Commit: `feat: finalize right column order, remove documentation block, add record meta footer`

---

## Verification checklist (full brief)

- [ ] Layer3 prose has no grey panel background — plain white
- [ ] Object record (`#efeee9`) and Exhibition history (`#ece9e2`) are distinct, both clearly darker than white
- [ ] Status & Provenance and Editions are white bordered cards, not grey panels
- [ ] Hero-to-data divider is visibly heavier than internal hairlines

- [ ] `isOriginalTier` field added to `ownershipRegistry` schema
- [ ] Provenance claims render in full, never collapsed, with correct ●/○ markers
- [ ] Legend shows only marker types present in that record's claims
- [ ] `institutional-assertion` claims render in a demoted, 0.6-opacity "Additional records" sub-section
- [ ] `speculation` claims never render anywhere publicly
- [ ] `isOriginalTier: true` tiers render as a multi-copy block in Status & Provenance, not in Editions
- [ ] Unclaimed copies ARE shown within the multi-copy original block (different from Editions accordion behavior)
- [ ] AP suppression logic is reused from the existing implementation, not duplicated
- [ ] Right column order is Object record → Status & provenance → Exhibition history → Editions → External links → Record meta footer
- [ ] Documentation & media section is completely removed
- [ ] Exhibition entries show ↗ only when linked
- [ ] Record meta footer shows catalogue number, reasoning status (once, only here), last updated
- [ ] `ReasoningStatusBadge` no longer renders in Layer3

---

*Provenance Depth & Right Column Finalization · Brief #3 · June 2026*

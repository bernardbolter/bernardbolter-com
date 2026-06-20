# Basel Switzerland — Extracted Claims from Prose
*Sorted by subject and confidence — for review before entering into the schema*

---

## Provenance of the Basel Switzerland artwork itself (digital/aluminium)

- Work created during a Gerrit Rietveld Akademie school trip to Basel, 2007 — **documented-fact**
- First exhibited at the Gerrit Rietveld Akademie, before the Christmas break (2007), printed on A3 sheets — **documented-fact**
- A Collector's edition copy was exhibited in Amsterdam — **documented-fact** (confirm: same trip/venue as the Rietveld exhibition above, or separate?)
- That same Collector's edition copy was later sold via auction — **documented-fact**
- Current owner of that auctioned copy is unknown — not a confidence claim; represented as `unclaimed` in `copies[]`, not a provenance entry

## Edition structure (fact about the work's design, not ownership)

- Edition tiers: Monumental 3+1AP, Collector's 9+2AP — stated directly, **documented-fact**, though this is really `editionTiers[]` spec data, not a `provenanceConfidenceLayer` claim

## NOT provenance of Basel Switzerland — belongs to the Da Fen oil painting's own record

- Da Fen oil painting collaboration: commissioned by the artist in Shenzhen, no prior contacts, alongside London and Los Angeles paintings
- Basel artist (Da Fen painter) — name unconfirmed, classical/old-school painting style, chose Basel composition himself from available cities
- Oil painting dimensions: 100 × 100 cm
- Oil painting currently resides with Bolter's family in San Francisco, held for the right exhibition context
- (Implied) Payment/commission cost for the Basel painting — not explicitly separated from the general $500 figure mentioned for the trip; confirm if $500 was per-painting or total

## Not provenance at all — biographical, intent, and critical context (already in Layer3 fields)

- Square format rationale (portrait/landscape refusal) — Intent
- Skateboard as instrument of perception, understood retrospectively — Intent / Making
- Art Collision series (2003) as direct predecessor, 8 works, NYC + Amsterdam — In the series / seriesContext
- Gursky encounter at a Basel museum exhibition during the same trip, as a direct reference point — artHistoricalContext (already likely captured)
- Rietveld school's hostile/cool reception to the digital medium — In the practice / workContext
- Photoshop hand-stitching process, 18mm fisheye, 4–5 scenes blended — Process
- High aluminium production cost + gallery commission structure contributed to the series pausing — Why these materials / workContext
- Checklist approach dropped after Basel, replaced by "follow the skateboard" rule on the second work (London) — Process
- Horizon line lesson learned after the fifth image — Process

---

## Open questions before entering any of this into the schema

1. Was the Amsterdam exhibition of the Collector's edition copy the *same* event as "first exhibited at the Rietveld... before the Christmas break" (i.e. Rietveld is in Amsterdam), or a separate, later exhibition?
2. Is the auction a documented event you could name (auction house, approximate year) even if the buyer is unknown — that would strengthen the claim from a bare assertion to something with a stated evidence basis?
3. For the Da Fen oil painting — is there already a separate Artwork record for it in Payload, or does one need to be created so its provenance has a proper home?

---

## Schema addition: `relatedWorks` field

Separate from, and not feeding into, `provenanceConfidenceLayer`. This addresses the Da Fen oil painting connection — and any future case of one artwork having a meaningful link to another distinct artwork — without merging two objects' independent ownership histories into one field.

```ts
{
  name: 'relatedWorks',
  type: 'array',
  fields: [
    {
      name: 'relatedArtwork',
      type: 'relationship',
      relationTo: 'artworks',
      admin: { description: 'Use this when the related work has its own Artwork record. Leave empty and use relatedWorkNote below if no record exists yet.' },
    },
    {
      name: 'relationshipType',
      type: 'select',
      options: [
        { label: 'Derivative — oil painting interpretation', value: 'derivative-oil-painting' },
        { label: 'Derivative — other medium', value: 'derivative-other' },
        { label: 'Same series, related composition', value: 'series-related' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'relatedWorkNote',
      type: 'textarea',
      admin: { description: 'Short public-facing description of the relationship. If relatedArtwork is empty (no record exists yet), this is the only description available.' },
    },
  ],
}
```

### Display

On the artwork page, if `relatedWorks` is populated, a small line in Status & Provenance or just below it: *"A related [relationshipType label] exists — [relatedWorkNote, or link to relatedArtwork if set]."* Each linked artwork keeps its own independent `provenanceConfidenceLayer`/`ownershipHistory`/`copies[]` — this field never merges or aggregates ownership data across the two records.

### Do NOT

- Do not write the Da Fen oil painting's custody history (commission story, current location with Bolter's family) into Basel Switzerland's `provenanceConfidenceLayer` — it belongs on the oil painting's own record, linked via `relatedWorks`
- Do not require `relatedArtwork` to be populated — `relatedWorkNote` alone is valid for a related work that doesn't have its own catalogued record yet

---

## Basel Switzerland — provenance claims ready to enter

Once the Step 4 migration (per `dcs-editiontiers-ownership-addendum-v2.md`) is complete and the real `SeriesEditionTiers`/`editionTiers[]` structure is in place, enter these into `provenanceConfidenceLayer`:

```json
[
  {
    "claim": "Work created during a Gerrit Rietveld Akademie school trip to Basel, 2007",
    "evidenceBasis": "Artist account, direct experience",
    "confidenceLevel": "documented-fact"
  },
  {
    "claim": "First exhibited at the Gerrit Rietveld Akademie, before the Christmas break, 2007 — printed on A3 sheets",
    "evidenceBasis": "Artist account, direct experience",
    "confidenceLevel": "documented-fact"
  },
  {
    "claim": "A Collector's print copy was later exhibited in Amsterdam, at a separate exhibition from the Rietveld show",
    "evidenceBasis": "Artist account, direct experience",
    "confidenceLevel": "documented-fact"
  },
  {
    "claim": "That copy was sold at auction by the artist directly, at the Amsterdam exhibition",
    "evidenceBasis": "Artist account, direct experience — the artist conducted the sale personally",
    "confidenceLevel": "documented-fact"
  }
]
```

And in the Collector's print tier's `copies[]` array, the auctioned copy should be represented as genuinely unclaimed rather than omitted:

```json
{
  "copyNumber": "[unknown — leave blank, or use a placeholder like \"sold at Amsterdam auction\" if the field requires a value]",
  "isArtistProof": false,
  "owner": null,
  "claimStatus": "unclaimed",
  "collectorVisible": false,
  "dateAcquired": null,
  "claimedCopyNumberKnown": false,
  "notes": "Sold at auction by the artist personally, at a separate Amsterdam exhibition. Current owner not recorded at time of sale."
}
```

This is the honest representation: the sale itself is fully documented (the artist conducted it directly — no uncertainty there), but the buyer's identity genuinely was never recorded, so ownership remains `unclaimed`. The `notes` field (private) preserves the real circumstances for your own reference even though only the claim invitation renders publicly.

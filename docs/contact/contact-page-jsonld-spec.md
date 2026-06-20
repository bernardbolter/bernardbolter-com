# Contact Page — JSON-LD
## bernardbolter.com · Structured Data Spec
*June 2026 · Addendum to contact-page-spec.md*
*Read alongside: artist-archive-schema-final.md, artwork-page-directive.md (JSON-LD pattern reference)*

---

## Why this page needs its own JSON-LD type

The artwork pages use `schema.org/VisualArtwork` because each artwork is a distinct entity worth describing richly to a machine reader. The contact page isn't describing an artwork — it's describing **how to reach a person**. The correct schema.org type is `ContactPage`, which mostly signals page *purpose* to a crawler; the actual substance lives in a nested `Person` object via the `about` property.

This follows the same architectural rule as every other JSON-LD block on the site (see artist-archive-schema-final.md, schema-wide rules): **generated programmatically at render time from stored field values, never hardcoded.**

---

## File location

```
src/utilities/
  generateContactPageJsonLd.ts    ← new, follows the same pattern as generateArtworkJsonLd.ts
```

Takes the full Artist singleton object (already fetched in `page.tsx` per contact-page-spec.md Section 2.2) and returns a complete JSON-LD object. Injected via Next.js `generateMetadata` into `<head>` as a `<script type="application/ld+json">` block — same mechanism as the artwork page, do not introduce a different injection pattern for this page.

---

## Full output shape

```json
{
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Contact — Bernard Bolter",
  "url": "https://bernardbolter.com/contact",
  "about": {
    "@type": "Person",
    "name": "Bernard Bolter",
    "url": "https://bernardbolter.com",
    "identifier": [
      { "@type": "PropertyValue", "propertyID": "ULAN", "value": "[artist.ulanUri]" },
      { "@type": "PropertyValue", "propertyID": "Wikidata", "value": "[artist.wikidataUri]" }
    ],
    "sameAs": [
      "[populated URLs from artist.socialChannels — only non-empty fields]"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "general enquiries",
      "email": "[artist.impressum.publicEmail]"
    },
    "workLocation": [
      "[one Place object per location entry where showOnContactPage === true — see below]"
    ]
  }
}
```

---

## Field-by-field construction rules

**`identifier`** — omit entries where the source field (`artist.ulanUri`, `artist.wikidataUri`) is null. Do not output an empty `value`. This matches the existing rule used in `generateArtworkJsonLd.ts` for the `creator` field — same omit-if-empty pattern, applied consistently.

**`sameAs`** — build from `artist.socialChannels`. Only include URLs for populated fields (the same filter logic as `ContactSocials.tsx` already uses — reuse that filtering function rather than re-deriving it independently, to guarantee the visual page and the JSON-LD never silently disagree about which platforms are "active"). If no social channels are populated, omit `sameAs` entirely rather than outputting an empty array.

**`contactPoint.email`** — read from `artist.impressum.publicEmail`. This field is already public by legal requirement (it's on the visible Impressum), so surfacing it in structured data introduces no new exposure.

**`workLocation`** — this is the field requiring the most care. Construct one `Place` object per entry in `artist.locations` where `showOnContactPage === true`, in the same filtered order `ContactStudios.tsx` already uses. Each entry:

```json
{
  "@type": "Place",
  "name": "[location.buildingName or location.city if buildingName is empty]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[location.streetAddress]",
    "postalCode": "[parse from streetAddress/city fields, or add a postalCode field if not already separately stored — see note below]",
    "addressLocality": "[location.city]",
    "addressCountry": "[location.country, as ISO 3166-1 alpha-2 — \"DE\", \"US\" — not the full country name]"
  }
}
```

**Postal code note:** the existing `locations` array schema (artist-archive-schema-final.md Section 4.6, extended in contact-page-spec.md Part 1.3) does not currently have a dedicated `postalCode` field — `streetAddress` and `city` are separate but postal code isn't broken out. For clean structured data, either (a) add a `postalCode` text field to the `locations` array alongside `streetAddress` and have the artist fill it in for each public studio, or (b) parse it out of the existing free-text fields if it's already embedded there. Option (a) is strongly preferred — schema.org's `PostalAddress` expects postal code as its own property, and parsing free text is fragile. Flag this as a small schema addition if not already present by the time this is built.

**`addressCountry` must be ISO 3166-1 alpha-2**, not the full country name stored in `location.country` ("Germany" → `"DE"`, "USA" → `"US"`). Add a small lookup/mapping utility (`countryNameToIsoCode.ts` or similar) rather than hardcoding the conversion inline in the JSON-LD generator — this is a general utility that may be useful elsewhere on the site (e.g. artwork `locationCreated` fields use the same pattern per artwork-page-directive.md).

---

## The residence guard — critical, do not skip

**`workLocation` must be built from the exact same filtered array (`showOnContactPage === true`) that `ContactStudios.tsx` uses to render the visual cards — not from the full `locations` collection.**

This is the single most important rule in this spec. A residence address hidden from the visual page but present in JSON-LD is not actually hidden — it's silently scraped by any crawler or AI system reading the page's structured data, arguably *more* exposed than if it were visible, since a person browsing the page would never see it to object, but a machine reading the markup gets it regardless.

The `beforeChange` validation hook described in contact-page-spec.md Part 1.3 (blocking `showOnContactPage: true` on any `type: 'residence'` location) is the primary defense and already prevents this at the data layer. But `generateContactPageJsonLd.ts` must independently filter on `showOnContactPage === true` as well — defense in depth, not reliance on the hook alone. If the filtering logic ever needs to change, change it in one shared utility both `ContactStudios.tsx` and `generateContactPageJsonLd.ts` import from, rather than maintaining two separate filter implementations that could drift out of sync.

---

## What is deliberately excluded from JSON-LD

- **WhatsApp number** — not output as a `telephone` property or anywhere else in structured data. WhatsApp contact is a UI-level affordance (a button linking to `wa.me`), not something that should be machine-discoverable as a phone number. Putting the raw number in plain JSON-LD makes it trivially scrapable in a way a clicked button is not.
- **Studio map images** — no `image` property pointing at the pre-rendered map files. These are decorative/wayfinding visuals for human readers, not meaningful structured data.
- **`contactStatus` / `contactStatusNote`** — availability status is a transient, manually-updated UI signal, not stable structured data worth indexing. Search engines caching a stale "Available" status from months ago would be actively misleading. Do not include.
- **Form-related fields** — the enquiry form itself, subject options, etc. have no schema.org representation here and shouldn't be forced into one.

---

## Verification

- [ ] `generateContactPageJsonLd.ts` created in `src/utilities/`, follows the same function signature pattern as `generateArtworkJsonLd.ts` (takes the artist object, returns a plain JS object)
- [ ] Injected via `generateMetadata` in `app/(public)/contact/page.tsx`, rendered as `<script type="application/ld+json">` in `<head>`
- [ ] `identifier` array omits ULAN/Wikidata entries when the source field is null — never outputs an empty `value`
- [ ] `sameAs` reuses the same social-channel filter logic as `ContactSocials.tsx` — not a separately maintained filter
- [ ] `sameAs` omitted entirely (not an empty array) when no social channels are populated
- [ ] `workLocation` array contains exactly one entry per `showOnContactPage === true` location, using the same shared filter utility as `ContactStudios.tsx`
- [ ] Confirm directly: temporarily set a `type: 'residence'` location's `showOnContactPage` via direct database edit (bypassing the admin hook, to test the JSON-LD layer's independent defense) and verify `generateContactPageJsonLd.ts` still excludes it — this proves the second guard layer actually works rather than silently relying on the first
- [ ] `addressCountry` outputs ISO 3166-1 alpha-2 codes ("DE", "US"), not full country names
- [ ] No `telephone`/WhatsApp number anywhere in the output
- [ ] No `contactStatus` or map image references in the output
- [ ] Validated with Google's Rich Results Test (search.google.com/test/rich-results) — no structural errors
- [ ] Validated with schema.org's own validator (validator.schema.org) — confirms correct vocabulary usage even where Google has no special rendering for `ContactPage`
- [ ] View page source on the live/staging contact page — confirm the script block is present and is valid, parseable JSON (a stray trailing comma breaks the entire block silently)

---

*Contact page JSON-LD spec · bernardbolter.com · June 2026*
*Addendum to contact-page-spec.md — read together for full contact page implementation.*

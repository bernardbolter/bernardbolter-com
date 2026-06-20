# Contact Page — Build Spec
## bernardbolter.com · Next.js + Tailwind + Payload CMS
*Read alongside: `design-system.md` · `artist-archive-schema-final.md`*

---

## Overview

The contact page is a complete rebuild. It is not a form with some text — it is the page that explains what this archive is, how to reach the artist, and how people connected to the work can become part of the record. It has a distinct voice and serves multiple distinct audiences.

This spec covers:
1. Schema additions to the Artist singleton (Payload CMS)
2. The full component structure and content sections
3. Styling rules
4. The availability status system
5. What NOT to do

---

## Part 1 — Schema additions to Artist singleton

These fields are additions to the existing Artist singleton in `src/collections/Artist.ts`. Add them to **Section 4.7 Contact** of the schema. All are `NEW`.

### 1.1 Contact status (availability indicator)

```ts
{
  name: 'contactStatus',
  type: 'select',
  options: [
    { label: 'Available', value: 'available' },
    { label: 'Away — slow to respond', value: 'away' },
    { label: 'Not currently available', value: 'unavailable' },
  ],
  defaultValue: 'available',
  admin: {
    description: 'Update this to reflect your current availability. Shown on the contact page.',
  },
},
{
  name: 'contactStatusNote',
  type: 'text',
  admin: {
    description: 'Optional one-line note shown alongside the status. E.g. "Open to exhibition proposals" or "In the studio — back in two weeks."',
  },
},
```

### 1.2 Studio photo

```ts
{
  name: 'contactPhoto',
  type: 'upload',
  relationTo: 'media',
  admin: {
    description: 'Studio portrait shown on the contact page, next to the provenance section. Portrait orientation works best — image displays at a 3:4 aspect ratio.',
  },
},
{
  name: 'contactPhotoCaption',
  type: 'text',
  localized: true,
  admin: {
    description: 'Optional one-line caption under the photo. E.g. "In the studio, Markgraffendamm — surrounded by the work that ends up here."',
  },
},
```

### 1.3 Studio locations and maps

The Artist singleton already has a `locations` array (city, country, type, primary, current, startYear — see `artist-archive-schema-final.md` Section 4.6). This addition extends each entry with optional address and map-image fields, used only for studio-type entries shown on the contact page.

**Maps are pre-rendered images, not a live API call.** Earlier drafts of this spec called for a live Google Static Maps API integration. That approach was dropped — Google requires an active billing account on a Cloud project even though usage at this site's scale would stay within the free tier, which is unnecessary overhead for two fixed, rarely-changing locations. Instead, the artist exports a static map image manually (via Mapbox's static export tool, styled to match the site's muted palette) and uploads it like any other media asset. No API key, no billing account, no live external request at render time.

**Add these fields to each entry in the existing `locations` array:**

```ts
{
  name: 'streetAddress',
  type: 'text',
  admin: {
    description: 'Optional. Only shown publicly for studio locations on the contact page — never for home/residence entries. Leave blank for any location you don\'t want a street address published for.',
  },
},
{
  name: 'buildingName',
  type: 'text',
  admin: {
    description: 'Optional. E.g. "CANK, 3rd floor". Shown alongside the address on the contact page.',
  },
},
{
  name: 'showOnContactPage',
  type: 'checkbox',
  defaultValue: false,
  admin: {
    description: 'When true, this location renders as a card with address and map on the contact page. Only enable for studio locations you are comfortable being publicly mapped. Never enable for a residence-only entry.',
  },
},
{
  name: 'mapImage',
  type: 'upload',
  relationTo: 'media',
  admin: {
    description: 'Required if showOnContactPage is true. A pre-rendered static map image — export from Mapbox (or similar) centered on this location, styled to match the site. Re-export and re-upload only if the location changes. Recommended export size: 800×500px or similar 16:10 ratio.',
  },
},
{
  name: 'mapLinkUrl',
  type: 'text',
  admin: {
    description: 'Optional. A Google Maps (or other) URL this location\'s card links out to when clicked — lets the visitor open a real interactive map / get directions. If blank, the map image is not clickable.',
  },
},
```

**Validation note for Cursor:** add a `beforeChange` hook on the Artist singleton (or field-level validation) that throws if `showOnContactPage: true` but `mapImage` is missing, or if `type === 'residence'` and `showOnContactPage: true` — residence-only locations must never be mappable on the public contact page, regardless of what the artist sets. This is a hard guard, not just an admin description — enforce it in code so a future accidental toggle can't expose a home address.

This is a deliberate decision, recorded for context: the artist reviewed the tradeoff (precise public map vs. text-only mention) and decided in favour of full address + map for active studio locations, on the basis that the people likely to use this — collectors and serious visitors — benefit from low-friction access, and the site is not yet at a scale where unsolicited visits are a real concern. If that changes, the fix is simply setting `showOnContactPage: false` per location — no rebuild needed.

### 1.4 Direct contact channels

```ts
{
  name: 'whatsappNumber',
  type: 'text',
  admin: {
    description: 'WhatsApp number in international format without spaces or symbols, e.g. 49171234567. Used to generate a wa.me link on the contact page.',
  },
},
{
  name: 'whatsappPrefilledMessage',
  type: 'text',
  admin: {
    description: 'Optional pre-filled message when someone opens WhatsApp via the contact page. Plain text. E.g. "Hi Bernard, I\'m interested in one of your works."',
  },
},
```

### 1.5 Social channels — replace existing `instagramUrl` + `otherLinks`

Remove the existing `instagramUrl` (text) and `otherLinks` (array) fields. Replace with a structured `socialChannels` group. This is the single source of truth for all social links across the site — nav, footer, and contact page all read from here.

```ts
{
  name: 'socialChannels',
  type: 'group',
  fields: [
    { name: 'instagram', type: 'text', label: 'Instagram URL' },
    { name: 'facebook',  type: 'text', label: 'Facebook URL' },
    { name: 'youtube',   type: 'text', label: 'YouTube URL' },
    { name: 'vimeo',     type: 'text', label: 'Vimeo URL' },
    { name: 'linkedin',  type: 'text', label: 'LinkedIn URL' },
    { name: 'tiktok',    type: 'text', label: 'TikTok URL' },
  ],
  admin: {
    description: 'Leave blank any platform not in active use. Only populated platforms are shown on the site.',
  },
},
{
  name: 'primarySocialChannel',
  type: 'select',
  options: [
    { label: 'Instagram', value: 'instagram' },
    { label: 'Facebook',  value: 'facebook' },
    { label: 'YouTube',   value: 'youtube' },
    { label: 'Vimeo',     value: 'vimeo' },
    { label: 'LinkedIn',  value: 'linkedin' },
    { label: 'TikTok',    value: 'tiktok' },
  ],
  admin: {
    description: 'The platform where you actively respond to direct messages. This one gets the "message me here" call-out on the contact page.',
  },
},
```

### 1.6 Contact page text sections

These fields replace the single `contactData.content` richtext blob from the old site. Each section is independently managed.

```ts
{
  name: 'contactProvenanceText',
  type: 'richText',
  localized: true,
  admin: {
    description: 'The provenance invitation section. Explains what provenance means here, invites owners of works to make contact.',
  },
},
{
  name: 'contactThankYouText',
  type: 'richText',
  localized: true,
  admin: {
    description: 'Optional. A personal note of thanks to collectors and supporters.',
  },
},
{
  name: 'contactCorrectionsText',
  type: 'richText',
  localized: true,
  admin: {
    description: 'Optional. Invites anyone with archive materials — photographs, catalogues, exhibition records — to contribute to the record.',
  },
},
{
  name: 'contactEnquiryIntro',
  type: 'richText',
  localized: true,
  admin: {
    description: 'Short intro above the contact form. Explains what the form is for — commissions, exhibition proposals, general questions.',
  },
},
```

### 1.7 Impressum fields

These replace hardcoded JSX in the old component. All are private — never shown in public API responses.

```ts
{
  name: 'impressum',
  type: 'group',
  access: { read: artistOrAdmin },
  fields: [
    { name: 'legalName',    type: 'text',     label: 'Full legal name' },
    { name: 'streetAddress', type: 'text',    label: 'Street address' },
    { name: 'postalCode',   type: 'text',     label: 'Postal code' },
    { name: 'city',         type: 'text',     label: 'City' },
    { name: 'country',      type: 'text',     label: 'Country' },
    { name: 'publicEmail',  type: 'email',    label: 'Public contact email' },
    { name: 'kleinunternehmerText', type: 'textarea', label: 'Kleinunternehmer legal text' },
  ],
},
```

**No `odrText` field.** The EU's Online Dispute Resolution platform was permanently discontinued on 20 July 2025 (Regulation (EU) 2024/3228 repealed the original ODR Regulation). The legal requirement to link to it no longer exists, and legal guidance now recommends actively removing old ODR references from existing Impressum pages rather than carrying them forward. Do not add this field, and do not port the old site's ODR paragraph. If the EU introduces a successor disclosure requirement later, that will need its own spec — it is not the same text and not needed now.

---

## Part 2 — Page structure and component architecture

### 2.1 File locations

```
src/
  app/(public)/contact/
    page.tsx                    ← server component, fetches artist singleton
  components/Contact/
    Contact.tsx                 ← main client component (receives artist data as props)
    ContactZoneA.tsx            ← grid wrapper for the two-column zone (header/photo/provenance/socials)
    ContactPhoto.tsx            ← studio photo + caption, left column
    ContactStatus.tsx           ← availability indicator
    ContactProvenance.tsx       ← provenance invitation section
    ContactStudios.tsx          ← studio location cards with maps
    ContactSocials.tsx          ← social channels section
    ContactForm.tsx             ← enquiry form (ported from old site)
    ContactImpressum.tsx        ← impressum block
```

### 2.2 Data fetching

`page.tsx` is a server component. It fetches the Artist singleton via Payload's local API and passes the data as props to `Contact.tsx`. No `useArtworks` provider involved — this page does not need artwork data.

```ts
// page.tsx (server component)
import { getPayload } from 'payload'
import config from '@payload-config'
import Contact from '@/components/Contact/Contact'

export default async function ContactPage() {
  const payload = await getPayload({ config })
  const artist = await payload.findGlobal({ slug: 'artist' })
  return <Contact artist={artist} />
}
```

`Contact.tsx` is a client component only because `ContactForm.tsx` requires client state. Pass the artist data down as props — do not re-fetch on the client.

### 2.3 Layout structure — two zones

The page splits into two layout zones on desktop. This is the single most important structural decision in this spec — read carefully before building.

**Zone A — two-column** (header through social channels)
On `l:` (979px) and above, this zone renders as a CSS grid: a fixed-width left column (280px) holding the studio photo and availability status, and a flexible right column holding the provenance text, WhatsApp link, thank-you note, studio location cards, and Instagram callout — in that order.

On `m:` and below, Zone A collapses to a single column — photo first (normal block, not pinned), then the text content below it, full width.

**The photo does NOT use `position: sticky`.** It scrolls normally with the page like every other element on the site. This was deliberately tested and rejected — a sticky photo is a new fixed-position pattern outside the site's existing chrome system (nav, info panel) and reads as a departure from the rest of the site's behaviour. Do not add sticky positioning here under any circumstance, even if it seems like an improvement.

**Zone B — single column** (form through Impressum)
Below Zone A, a horizontal divider (`border-top: 1px solid #ddd`) marks the seam. From that divider down, the layout is a single column, `max-width: 550px`, centered (`margin: 0 auto`), at all breakpoints including desktop. This includes: the enquiry intro line, the form, the corrections section, the response note, and the Impressum.

**Why the seam sits where it does:** Zone A is the "story" — who you are, why this archive exists, how to reach you directly. Zone B is transactional and logistical — the form, the legal footer. The wider two-column treatment suits prose and a portrait; it would feel wrong applied to a form, which reads better narrow and centered, consistent with the rest of the site's static pages (Bio, CV, Statement).

### 2.4 Page container — outer width

The outer page container is wider than the old single-column contact page to accommodate Zone A's two-column grid:

```
max-width: 1100px (was 550px on old site)
padding: 0 2rem
margin: 0 auto
```

Zone B re-narrows to 550px internally, as described above — the outer container does not change between zones, only the content width within it.

### 2.5 Section order

The page renders in this exact order, top to bottom:

1. `HeaderTitle` — "contact" (existing component, `large={true}`) — full width, above both zones
2. Close button (fixed, top-right — port from old component, same pattern)

**— Zone A begins (two-column on `l:` and above) —**

3. **Left column:** `ContactPhoto` (studio photo + caption), then `ContactStatus` below it
4. **Right column:** `ContactProvenance` (provenance heading, intro text, WhatsApp link, thank-you note)
5. **Right column, continued:** `ContactStudios` (studio location cards with maps — only locations with `showOnContactPage: true`)
6. **Right column, continued:** `ContactSocials`

**— Zone A ends; divider; Zone B begins (single column, 550px, all breakpoints) —**

7. **Enquiry form** — `ContactForm` (with section intro above it)
8. **Corrections invitation** — brief, below the form
9. **Response note** — one line
10. **Impressum** — `ContactImpressum`

---

## Part 3 — Component specs

### 3.0 ContactZoneA — grid wrapper

Wraps `ContactPhoto` + `ContactStatus` (left) and `ContactProvenance` + `ContactSocials` (right).

**Grid behaviour:**
```css
/* default (mobile/tablet, below l: 979px) */
display: block;
/* ContactPhoto renders first, full width, normal block flow */
/* ContactStatus, ContactProvenance, ContactSocials follow below it */

/* l: 979px and above */
display: grid;
grid-template-columns: 280px 1fr;
gap: 3rem;
align-items: start;
```

**Critical: no `position: sticky` on the left column or on `ContactPhoto` at any breakpoint.** The photo scrolls with the page like every other element on the site. This is a deliberate decision, not an oversight — confirmed after reviewing and rejecting a sticky version. Do not add sticky positioning, even if it seems like it would improve the desktop experience.

At `l:` and above, render order is: left column (`ContactPhoto` then `ContactStatus`), right column (`ContactProvenance` then `ContactSocials`), as CSS grid children — not relying on visual order alone, use the actual DOM/grid placement so the markup reads sensibly without CSS.

### 3.1 ContactPhoto

Reads `contactPhoto`, `contactPhotoCaption` from artist props.

**Structure:**
```
<div>
  <Image src={contactPhoto.url} alt={contactPhoto.alt || 'Bernard Bolter in the studio'} />
  {contactPhotoCaption && <p>{contactPhotoCaption}</p>}
</div>
```

**Styling:**
- Image container: `width: 100%`, `aspect-ratio: 3 / 4`, `border-radius: 4px`, `overflow: hidden`
- Image: `object-fit: cover` — this is the one exception to the site's general "no object-cover" rule, since this is a portrait photo, not an artwork. Do not apply `object-cover` logic anywhere else.
- Caption: `font-heading`, `text-[0.8125rem]` (13px), `text-[var(--text-muted)]`, `leading-[1.5]`, `mt-[0.75rem]`
- Use Next.js `<Image>` component with explicit `sizes` prop for the responsive width (280px at `l:` and above, full container width below)

**Do NOT:**
- Do not show this component if `contactPhoto` is null — the layout gracefully falls back to ContactStatus alone in the left column (or right column content shifts up if mobile)
- Do not crop or distort the image outside the 3:4 aspect-ratio container
- Do not add hover effects, zoom, or lightbox behaviour — this is a quiet, static portrait, not an interactive artwork

### 3.2 ContactStatus

Reads `contactStatus` and `contactStatusNote` from artist props.

**Position:** Renders in Zone A's left column, directly below `ContactPhoto`. Not a full-width bar at the top of the page — it lives next to the photo, as a small status block, not a banner.

**Visual:**
- `margin-top: 1.5rem` (separation from photo/caption above)
- A coloured dot (filled circle, 8px) followed by the status label, inline
- `contactStatusNote`, if present, renders as a separate line below the dot+label, not inline with it — it's a longer sentence and inline would wrap awkwardly in a 280px column
- Dot colours: `available` → `$status-success` (#56ba5a) · `away` → `$status-warning` (#f0ad4e) · `unavailable` → `$ui-line` (#999)
- Label: `font-heading`, `text-sm` (0.875rem), `font-weight: 600`, `text-[var(--text-medium)]`
- Note line: `font-heading`, `text-[0.8125rem]` (13px), `text-[var(--text-muted)]`, `margin-top: 0.25rem`
- Do not show this component if `contactStatus` is null

**Do NOT:**
- Do not animate the dot (no pulsing, no blinking)
- Do not use colour alone to convey status — always show the label text
- Do not render as a full-width banner — it belongs in the narrow left column only

### 3.3 ContactProvenance

Reads `contactProvenanceText`, `contactThankYouText`, `whatsappNumber`, `whatsappPrefilledMessage` from artist props.

**Structure:**
```
<section>
  <h2>If you own one of these works</h2>
  <RichText content={artist.contactProvenanceText} />    ← Payload Lexical renderer
  
  {whatsappNumber && (
    <a href={whatsappUrl}>
      <WhatsAppIcon />
      Message me directly on WhatsApp
    </a>
  )}

  {contactThankYouText && (
    <>
      <h3>A note of thanks</h3>
      <RichText content={artist.contactThankYouText} />
    </>
  )}
</section>
```

**WhatsApp icon:** Use the circular badge SVG provided alongside this spec (`whatsapp-icon-circular.svg` — official WhatsApp brand glyph, green circle with white phone receiver, 32×32 viewBox). Add it to `src/svgs/` following the existing project pattern for SVG components (the same pattern used for `LinkSvg`, `CloseCircleSvg`, etc — check `/svgs/` for the established export convention before creating `WhatsAppIcon.tsx`). Import and render at 20×20px inside the button. Do not use Font Awesome, a generic chat-bubble icon, or hand-redraw the glyph — use the provided file as-is.

**Instagram icon:** The project already has an Instagram icon in use elsewhere on the site (nav, footer, or similar). Reuse that existing component/SVG for `ContactSocials` rather than creating a new one — check `/svgs/` for the existing `InstagramSvg` (or equivalent name) before building anything new.

**WhatsApp URL construction:**
```ts
const whatsappUrl = artist.whatsappPrefilledMessage
  ? `https://wa.me/${artist.whatsappNumber}?text=${encodeURIComponent(artist.whatsappPrefilledMessage)}`
  : `https://wa.me/${artist.whatsappNumber}`
```

**Styling:**
- This component renders inside Zone A's right column — no max-width or centering of its own; it fills the grid column (`1fr`, right of the 280px photo column on `l:`+, full width below `l:`)
- `h2`: `font-heading`, `text-[1.625rem]` (26px), `font-weight: 800`, `text-[var(--text-strong)]`
- `h3`: `font-heading`, `text-base` (16px), `font-weight: 700`, `text-[var(--text-primary)]`
- Prose paragraphs: `font-body`, `text-sm` (0.875rem) mobile → `text-[1.0625rem]` desktop, `leading-[1.7]`, `text-[var(--text-dark)]`, `max-width: 58ch` (prevents lines stretching too wide in the now-larger right column), `pb-[0.9rem]` — no `text-indent` in the wider layout, drop the old indented-paragraph treatment from the original mockup
- **WhatsApp button — revised colour, not the dark neutral used elsewhere on the page.** Solid filled button, not a bare text link — `inline-flex`, `align-items: center`, `gap: 0.5rem`, `padding: 0.625rem 1.125rem`, `background: #6FA88A` (a muted sage green — softer than WhatsApp's literal brand green `#25D366`, chosen so the button reads as "WhatsApp" via the icon without introducing a loudly saturated colour into the site's muted palette), `color: white`, `border-radius: 3px`, `font-heading`, `font-weight: 600`, `text-sm`. Icon: 20×20px (the circular badge SVG, rendered at full colour — its own green/white reads fine against the muted sage background). No hover underline needed since it's a filled button — use a subtle `opacity: 0.9` on hover instead. If `#6FA88A` reads too flat or too pastel once seen in browser, treat this as a Section 12 "Provisional System" value per the design system — adjust and update the spec, don't leave components drifting from it.
- Thank-you block: `margin-top: 2rem`, `padding-top: 1.5rem`, `border-top: 1px solid #eee`
- Section bottom: `padding-bottom: 2rem` before handing off to `ContactStudios` directly below it in the same right column

### 3.4 ContactStudios

Reads `locations` array from artist props. Filters to entries where `showOnContactPage === true`. If the filtered array is empty, this component renders nothing.

**Purpose:** Shows each active, publicly-mappable studio location as a small card — address, building name if present, and a pre-rendered map image. This is deliberately not shown for any location where `showOnContactPage` is false, which includes all residence-type entries by the schema-level guard in Part 1.3.

**Structure:**
```
{studioLocations.length > 0 && (
  <div>
    <h3>Studios</h3>
    <div className="studio-cards">
      {studioLocations.map(location => (
        <a key={location.id} href={location.mapLinkUrl || undefined} target="_blank" rel="noopener noreferrer" className="studio-card">
          <Image src={location.mapImage.url} alt={`Map of ${location.buildingName || location.city}`} />
          <div>
            {location.buildingName && <p className="building">{location.buildingName}</p>}
            <p className="address">{location.streetAddress}</p>
            <p className="city">{location.city}, {location.country}</p>
          </div>
        </a>
      ))}
    </div>
  </div>
)}
```

**Map implementation — pre-rendered upload, not a live API call.** The map is a static image the artist exports once (via Mapbox's static export tool or similar) and uploads to `location.mapImage` in Payload, exactly like `contactPhoto`. There is no live map-tile request at render time, no API key, no billing dependency. Re-export and re-upload only if a studio location changes. If `location.mapLinkUrl` is populated, the whole card is a link that opens that URL (typically a real Google Maps link) in a new tab — the live, interactive map experience lives there, not inline on the contact page. If `mapLinkUrl` is empty, the card renders as a non-interactive `<div>` instead of an `<a>`.

**Layout — multiple studios:**
If more than one location has `showOnContactPage: true` (e.g. Berlin and San Francisco both), render the cards side by side in a row on `l:` and above (`display: flex`, `gap: 1.5rem`, each card `flex: 1`), stacked vertically below `l:`.

**Styling:**
- Section heading (`h3`): `font-heading`, `text-base` (16px), `font-weight: 700`, `text-[var(--text-primary)]`, `margin-bottom: 0.75rem`
- Card: `border: 1px solid #eee`, `border-radius: 4px`, `overflow: hidden`, `background: white`, `display: block` (works whether rendered as `<a>` or `<div>`), hover (when a link) `border-color: #ccc` transition, no underline on the card link itself
- Map image: `width: 100%`, `aspect-ratio: 16/9`, `object-fit: cover`, sits at the top of the card. Use Next.js `<Image>` with explicit `sizes` for the responsive card width.
- Card text padding: `padding: 0.75rem 1rem`
- Building name: `font-heading`, `text-sm`, `font-weight: 600`, `text-[var(--text-primary)]`
- Address / city lines: `font-heading`, `text-[0.8125rem]` (13px), `text-[var(--text-muted)]`, `line-height: 1.5`

**Do NOT:**
- Do not render a card for any location where `showOnContactPage` is false
- Do not use a live map API call or interactive embed (no Google Static Maps API request, no Mapbox GL instance, no live Google Maps iframe) — the map is a pre-rendered uploaded image only, per the rationale above
- Do not display this section if no locations are flagged for public display — no empty-state placeholder, no "no studios to show" message, the section simply doesn't render
- Do not pull map imagery from any source other than `location.mapImage` — no client-side geocoding, no dynamically constructed map URLs

### 3.5 ContactSocials

Reads `socialChannels`, `primarySocialChannel` from artist props.

**Logic:**
- Render only platforms where the URL field is populated — do not render empty slots
- If `primarySocialChannel` is set and that platform is populated, call it out separately with the message framing
- Remaining populated platforms render as a secondary row of icon links

**Structure:**
```
{primarySocialChannel is set and populated && (
  <div>
    <p>Most active here day to day — follow the work as it happens,
       and DM me directly.</p>
    <a href={primaryUrl}>[PlatformIcon] [Platform name]</a>
  </div>
)}

{other populated platforms exist && (
  <div>
    <p>Also here:</p>
    {otherPlatforms.map(platform => (
      <a href={url} target="_blank" rel="noopener noreferrer">
        [Icon]
      </a>
    ))}
  </div>
)}
```

**Styling:**
- Primary channel: same max-width as provenance section, generous padding-top separator from previous section
- Secondary platforms: icon row, icons 24×24px, gap `1rem`, `opacity-60` at rest, `opacity-100` on hover, transition `opacity 0.2s ease`
- Platform icons: use simple SVG icons — do not use any icon library that requires a build dependency. Inline SVGs preferred.

**Do NOT:**
- Do not render placeholder icon slots for unpopulated platforms
- Do not hardcode platform URLs — always read from `socialChannels`
- Do not open links in the same tab — all social links `target="_blank" rel="noopener noreferrer"`

### 3.6 ContactForm

Ported from `Contact.tsx` in the old repo. Logic is unchanged — keep the Formcarry endpoint, validation, and three-state handling. The following changes apply:

**Changes from old component:**
- Remove `useArtworks` dependency entirely — this component no longer reads from the artwork provider
- Add a `subject` select above the name field:
  ```
  Options:
  - "Interested in a work"
  - "Commission enquiry"
  - "Exhibition or collaboration"
  - "I own one of your works"
  - "Archive — corrections or additions"
  - "Other"
  ```
- The subject field is required. Include validation matching the other fields.
- Render `contactEnquiryIntro` richtext above the form container as a short intro paragraph (passed as prop, rendered via Payload Lexical renderer)
- Remove the loading state — the form renders immediately. Only the richtext intro is conditional on data.

**Position:** This component lives in Zone B — single column, `max-width: 550px`, centered, below the Zone A divider. Not part of the two-column grid.

**Form container styling — revised, "clean flat" treatment (white fields, thin border, no fill colour). This replaces the old flat-grey Sass styling entirely — do not port the old `#ddd` filled-input look.**
- No outer bordered card wrapper around the whole form — the form fields sit directly in the page flow within the 550px Zone B column. (This differs from the original spec, which wrapped the form in a bordered/background card. That treatment is dropped in favour of a more contemporary, lighter feel.)
- `max-width: 480px`, no extra centering needed since it inherits Zone B's centering

**Form field styling:**
- Labels: `font-heading`, `text-xs` (0.75rem), `font-weight: 600`, `text-[var(--text-muted)]` (#888), `uppercase`, `tracking-[0.04em]`, `mb-[0.375rem]`, `display: block`
- Inputs, select, and textarea: `bg-white`, `border: 1px solid #ddd`, `border-radius: 4px`, `padding: 0.625rem 0.75rem`, `text-sm` (14px), `text-[var(--text-primary)]` (#444), `box-sizing: border-box`, `width: 100%`
- Focus state: border colour switches to `var(--status-success)`, no default browser outline, add `box-shadow: 0 0 0 2px rgba(86,186,90,0.15)` for visible focus ring
- Error state: border colour switches to `var(--status-error)`, `box-shadow: 0 0 0 2px rgba(217,83,79,0.15)`
- Error messages: `text-[0.6875rem]`, `text-[var(--status-error)]`, `margin-top: 0.25rem`, prepend `⚠` via pseudo-element
- Textarea: `resize: vertical`, `min-height: 110px`, `leading-[1.5]`
- Field vertical rhythm: `margin-bottom: 1.1rem` between each field group (label + input)
- Button: `background: var(--text-dark)` (#393B3E), `color: white`, `padding: 0.6875rem 1.75rem`, `font-heading`, `font-weight: 600`, `text-[0.9375rem]`, `tracking-[0.03em]`, `border-radius: 4px`, `border: none`, centred under the form (`text-align: center` on wrapper, button is inline), hover `opacity: 0.9` transition, disabled `opacity: 0.5 cursor-not-allowed`
- Alert success: `bg-[rgba(86,186,90,0.08)]`, `border: 1px solid rgba(86,186,90,0.3)`, `text-[var(--status-success)]`, `border-radius: 4px`, `padding: 1rem`, `display: flex`, `align-items: center`, `gap: 0.75rem`
- Alert error: same pattern with `var(--status-error)` colours
- Alert animation: `slideDown` keyframe (opacity 0→1, translateY -10px→0, 0.3s ease) — port from old Sass

**Do NOT:**
- ❌ Use `<form>` tags — use `<div onKeyDown>` with `onClick` on the button
- ❌ Re-introduce `useArtworks` or `ArtworkProvider` dependency
- ❌ Remove the subject field
- ❌ Remove the `noValidate` pattern

### 3.7 Corrections invitation

A short section below the form. Conditionally rendered if `contactCorrectionsText` is populated.

```
<section>
  <h3>Helping build the record</h3>
  <RichText content={artist.contactCorrectionsText} />
</section>
```

Styling matches the provenance section prose. No form, no CTA beyond the existing form above.

### 3.8 Response note

A single line of plain text. Not a richtext field — hardcoded. Sits between the corrections section and the Impressum.

```tsx
<p className="...">I read everything. I reply when I can.</p>
```

Styling: `font-body`, `text-sm`, `text-[var(--text-muted)]`, `text-center`, `py-[1.875rem]`

### 3.9 ContactImpressum

Reads from `artist.impressum`. Renders only if `impressum.legalName` is populated.

**Structure:**
```
<div>
  <Link href="/datenschutz"><LinkSvg /> Datenschutz</Link>

  <h2>Impressum</h2>
  <div />                         ← divider line

  <p>{legalName}</p>
  <p>{streetAddress}</p>
  <p>{postalCode} {city} {country}</p>
  <p>{publicEmail}</p>

  <div />                         ← divider line
  <p>{kleinunternehmerText}</p>

  <div />                         ← divider line
  <p>© all rights reserved 1974 – {new Date().getFullYear()}</p>
</div>
```

**Styling** (port from old Sass, convert units):
- Container: `flex flex-col`, `max-w-[800px]`, `mx-auto`, `pt-[1.875rem] pb-[1.875rem]`
- `h2` (Impressum): `font-heading`, `text-lg` (1.125rem), `font-light`, `tracking-[0.05em]`, `text-[var(--text-primary)]`, `pt-[0.9375rem]`
- Divider: `h-px w-full bg-[var(--ui-line)] my-[0.625rem]`
- `p` (address lines): `font-heading`, `text-base`, `text-[var(--text-primary)]`, `py-[3px]`, `font-medium`
- `p` (legal text): `text-sm`, `leading-[1.4]`, `font-light`, `text-[var(--text-secondary)]`, `pb-[5px]`
- Copyright: `font-heading`, `text-[0.8125rem]`, `text-[var(--text-primary)]`
- Datenschutz link: `text-[1.25rem]`, no underline at rest, underline on hover. SVG: `w-[15px] h-[15px]`, `fill-[var(--ui-icon)]`, `mr-[5px]`

---

## Part 4 — Availability status — admin shortcut

To make the status fast to update from the Payload admin, register a custom admin nav link that goes directly to the Artist singleton contact fields group. This is not a custom view — just a direct link in the admin sidebar navigation.

In `payload.config.ts`, under `admin.components.Nav` or equivalent, add a shortcut link pointing to:
```
/admin/globals/artist?group=contactStatus
```

Label: "Update availability"

This means one click from anywhere in the admin to flip the status — no hunting through the singleton.

---

## Part 5 — Page container styling

Outer container width is wider than the old single-column contact page — `1100px`, not `550px` — to accommodate Zone A's two-column grid.

```tsx
// Contact.tsx outer container
<section className="
  w-full min-h-screen
  flex flex-col
  bg-[var(--surface-page)]
  max-w-[1100px] mx-auto
  px-[2rem] pt-[9.375rem] pb-[1.875rem]
  overflow-y-scroll
  [scrollbar-width:none]
  [-ms-overflow-style:none]
  [&::-webkit-scrollbar]:hidden
">
```

**Width rules by zone, restated for clarity:**
- Outer container: `max-w-[1100px]`, `px-[2rem]`
- `HeaderTitle` and close button: full width of the outer container, unaffected by either zone
- Zone A (`ContactZoneA` wrapper — photo, status, provenance, socials): fills the outer container, grid-splits at `l:` per Section 2.3 / 3.0
- Zone A → Zone B transition: `border-top: 1px solid #ddd`, `padding-top: 2.5rem` on the Zone B wrapper
- Zone B (form, corrections, response note, Impressum): `max-w-[550px]`, `mx-auto` — re-narrows regardless of outer container width, at every breakpoint including desktop

The Impressum no longer has its own separate `800px` max-width — it inherits Zone B's `550px` column, since Zone B is already centered and narrow. This is a change from the original spec, where Impressum had a wider cap of its own.

---

## Part 6 — What NOT to do

- ❌ Do not re-introduce `useArtworks` or `ArtworkProvider` in any contact component
- ❌ Do not hardcode the WhatsApp number — always read from `artist.whatsappNumber`
- ❌ Do not hardcode social URLs — always read from `artist.socialChannels`
- ❌ Do not hardcode Impressum data — always read from `artist.impressum`
- ❌ Do not render empty social icon slots for unpopulated platforms
- ❌ Do not show `ContactStatus` if `contactStatus` is null
- ❌ Do not show `contactThankYouText` section if the field is empty
- ❌ Do not show `contactCorrectionsText` section if the field is empty
- ❌ Do not use default Tailwind breakpoints (`sm:`, `md:`, `lg:`) — use `s:`, `m:`, `l:`, `xl:`
- ❌ Do not use `px` for font sizes or spacing — use `rem` (exception: 1px borders, dividers)
- ❌ Do not use `<form>` tags in the form component — use div + onClick
- ❌ Do not add a loading spinner for the whole page — the form renders immediately, only richtext sections are conditional
- ❌ Do not animate the availability dot
- ❌ Do not render any social links in a new tab without `rel="noopener noreferrer"`
- ❌ **Do not apply `position: sticky` to `ContactPhoto` or its column.** This was explicitly tested and rejected — the photo scrolls normally with the page at all breakpoints. Do not reintroduce sticky positioning even as a later enhancement without first checking with the artist.
- ❌ Do not extend the two-column grid (Zone A) down into the form, corrections, response note, or Impressum — those sections are single-column at every breakpoint, by design
- ❌ Do not wrap the form fields in a bordered card container — the revised form styling sits directly in the page flow, no card background or border around the field group
- ❌ Do not use `object-cover` anywhere except `ContactPhoto` — this is the single deliberate exception to the site-wide no-object-cover rule, and it applies only to this one portrait image, never to artwork images
- ❌ Do not render a `ContactStudios` card for any location where `showOnContactPage` is false — this must be enforced both in the component's filter logic and at the schema level via the `beforeChange` validation hook described in Part 1.3
- ❌ Do not allow `showOnContactPage: true` on any `type: 'residence'` location, in code, regardless of what the admin UI permits a person to attempt — the schema hook is the actual guard, not just the admin field description
- ❌ Do not use an interactive map embed (iframe, Mapbox GL, Google Maps JS SDK) for `ContactStudios` — static image only, linking out to maps on click
- ❌ Do not call a live Static Maps API (Google or otherwise) at render time for `ContactStudios` — maps are pre-rendered, artist-uploaded images only, per Part 1.3
- ❌ Do not hand-redraw, substitute, or use a generic chat-bubble icon for WhatsApp — use the provided `whatsapp-icon-circular.svg` exactly as supplied
- ❌ Do not use WhatsApp's literal brand green (`#25D366`) for the button background — use the muted `#6FA88A` specified in Part 3.3, consistent with the site's restrained palette
- ❌ Do not create a new Instagram SVG component — reuse the one already in the project's `/svgs/` directory
- ❌ Do not add an `odrText` field to the Impressum schema or port the old site's ODR paragraph — the EU's ODR platform was discontinued in July 2025 and the disclosure is no longer required; see Part 1.6 for the full rationale

---

## Part 7 — Build order

Complete these steps in order. Each step has a verification check before proceeding.

**Step 1 — Schema**
Add the new fields to `src/collections/Artist.ts` following the field definitions in Part 1. Run `payload generate:types` to confirm no TypeScript errors.
✓ Payload admin shows all new fields on the Artist singleton. Types compile clean.

**Step 2 — Seed the Artist singleton**
Populate the new fields in the Payload admin:
- Set `contactStatus` to `available`
- Set `primarySocialChannel` to `instagram`
- Populate `socialChannels.instagram`
- Populate `whatsappNumber`
- Upload `contactPhoto`, populate `contactPhotoCaption`
- On the existing `locations` array: for each studio entry intended to be public (Berlin/CANK, San Francisco), set `streetAddress`, `buildingName`, `mapLinkUrl`, upload `mapImage` (the artist's pre-rendered Mapbox export), and `showOnContactPage: true`. Confirm no `type: 'residence'` entry has `showOnContactPage: true` — verify the `beforeChange` guard actually blocks this if attempted.
- Populate `impressum` group (no `odrText` field — see Part 1.6)
✓ All fields save without error. Attempting to set `showOnContactPage: true` on a residence-type location throws a validation error.

**Step 3 — page.tsx**
Replace the existing `app/(public)/contact/page.tsx` with the server component version in Part 2.2. Confirm it fetches and passes artist data correctly.
✓ `console.log(artist)` in the server component shows the full singleton including new fields.

**Step 4 — ContactPhoto and ContactStatus**
Build `ContactPhoto.tsx` and `ContactStatus.tsx`. Place them together in what will become Zone A's left column. Test all three status values visually. Test with and without `contactPhoto` populated.
✓ Dot colour and label text correct for each status value. `ContactStatus` absent when field is null. Photo renders at 3:4 aspect ratio with `object-fit: cover`. Caption renders below photo when present.

**Step 5 — ContactProvenance**
Build `ContactProvenance.tsx`. Add the `WhatsAppIcon.tsx` SVG component (from the provided `whatsapp-icon-circular.svg`) and reuse the existing Instagram icon from elsewhere in the project for later use in `ContactSocials`. Test with and without `whatsappNumber` populated.
✓ WhatsApp link present as a filled sage-green button (not the dark neutral colour) with the circular badge icon, when number is set; absent when not. Richtext renders correctly. Prose max-width caps at 58ch within the right column.

**Step 6 — ContactStudios**
Build `ContactStudios.tsx`. Use the uploaded `mapImage` field — no live map API call, no client-side map library. Test with zero, one, and two `showOnContactPage` locations.
✓ Section renders nothing when no locations qualify. Renders a single card for one location, side-by-side cards for two, on `l:` and above. Stacks vertically below `l:`. Card links out to `mapLinkUrl` in a new tab when populated; renders as a non-link `<div>` when not. Confirm no residence-type location can ever appear here.

**Step 7 — ContactSocials**
Build `ContactSocials.tsx`. Test with multiple platforms populated and with only one.
✓ Primary channel called out separately. Secondary platforms render as icon row. No empty slots.

**Step 8 — ContactZoneA assembly and grid verification**
Build `ContactZoneA.tsx` wrapping `ContactPhoto` + `ContactStatus` (left) and `ContactProvenance` + `ContactStudios` + `ContactSocials` (right). Verify the grid collapses correctly below `l:` (979px) and confirm there is no `position: sticky` anywhere in this component or its children.
✓ At `l:` and above: two-column grid, 280px left / 1fr right, gap 3rem. Below `l:`: single column, photo first, full width. Photo and status scroll normally with the page at every breakpoint — confirm by scrolling a tall viewport and checking the photo moves with the content, not pinned.

**Step 9 — ContactForm**
Port `ContactForm.tsx` from old component. Add subject select. Remove `useArtworks`. Apply the revised clean-flat field styling (white background, 1px border, no card wrapper). Test full submission flow.
✓ Form submits successfully via Formcarry. All three states (submitting, success, error) render correctly. Subject field validates. Form sits in Zone B at 550px max-width, centered, regardless of outer page width.

**Step 10 — ContactImpressum**
Build `ContactImpressum.tsx`. Confirm all data reads from Payload, nothing hardcoded. Confirm it inherits Zone B's 550px width rather than its own wider cap.
✓ Impressum renders correctly. No hardcoded strings. Width matches the form above it.

**Step 11 — Final assembly**
Assemble `Contact.tsx`: `HeaderTitle` + close button, then `ContactZoneA`, then the Zone A/B divider, then Zone B contents (`ContactForm`, corrections, response note, `ContactImpressum`). Check full page at mobile, `m:`, `l:`, and `xl:`.
✓ Two-column zone only appears at `l:` and above. Zone B is always 550px centered, independent of outer container width. Divider visible between zones. Close button fixed top-right. No sticky elements anywhere on the page. Studio cards (if populated) appear between the thank-you note and the Instagram callout.

---

*Contact page spec · bernardbolter.com · June 2026*
*Revised June 2026 — two-zone desktop layout (wide two-column header/provenance, narrow single-column form/footer), studio photo added, form restyled to clean flat treatment, sticky photo explicitly rejected.*

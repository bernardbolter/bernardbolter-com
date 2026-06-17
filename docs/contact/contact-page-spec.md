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

### 1.2 Direct contact channels

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

### 1.3 Social channels — replace existing `instagramUrl` + `otherLinks`

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

### 1.4 Contact page text sections

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

### 1.5 Impressum fields

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
    { name: 'odrText',      type: 'richText', label: 'ODR platform legal text' },
  ],
},
```

---

## Part 2 — Page structure and component architecture

### 2.1 File locations

```
src/
  app/(public)/contact/
    page.tsx                    ← server component, fetches artist singleton
  components/Contact/
    Contact.tsx                 ← main client component (receives artist data as props)
    ContactStatus.tsx           ← availability indicator
    ContactProvenance.tsx       ← provenance invitation section
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

### 2.3 Section order

The page renders in this exact order, top to bottom:

1. `HeaderTitle` — "contact" (existing component, `large={true}`)
2. Close button (fixed, top-right — port from old component, same pattern)
3. **Availability status bar** — `ContactStatus`
4. **Provenance section** — `ContactProvenance`
5. **Social channels** — `ContactSocials`
6. **Enquiry form** — `ContactForm` (with section intro above it)
7. **Corrections invitation** — brief, below the form
8. **Response note** — one line
9. **Impressum** — `ContactImpressum`

---

## Part 3 — Component specs

### 3.1 ContactStatus

Reads `contactStatus` and `contactStatusNote` from artist props.

**Visual:**
- A small horizontal bar or pill near the top of the page, below the header title
- A coloured dot (filled circle, 8px) followed by the status label and optional note
- Dot colours: `available` → `$status-success` (#56ba5a) · `away` → `$status-warning` (#f0ad4e) · `unavailable` → `$ui-line` (#999)
- Font: `font-heading`, `text-sm` (0.875rem), `text-[color-text-secondary]`
- Do not show this component if `contactStatus` is null

**Do NOT:**
- Do not animate the dot (no pulsing, no blinking)
- Do not use colour alone to convey status — always show the label text

### 3.2 ContactProvenance

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

**WhatsApp URL construction:**
```ts
const whatsappUrl = artist.whatsappPrefilledMessage
  ? `https://wa.me/${artist.whatsappNumber}?text=${encodeURIComponent(artist.whatsappPrefilledMessage)}`
  : `https://wa.me/${artist.whatsappNumber}`
```

**Styling:**
- Section max-width: `550px`, centered on `m:` and above
- `h2`: `font-heading`, `text-[1.375rem]` (22px), `font-weight: 800`, `text-[var(--text-strong)]`
- `h3`: `font-heading`, `text-base` (16px), `font-weight: 700`, `text-[var(--text-primary)]`
- Prose paragraphs: `font-body`, `text-sm` (0.875rem) mobile → `text-lg` (1.125rem) desktop, `leading-[1.6]`, `text-[var(--text-dark)]`, `indent-[0.75rem]`, `pb-[1.25rem]`
- WhatsApp link: inline-flex, gap `0.5rem`, `font-heading`, `font-semibold`, `text-sm`, `text-[var(--text-primary)]`, hover underline. Icon: 20×20px, fill `var(--ui-icon)`

### 3.3 ContactSocials

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

### 3.4 ContactForm

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

**Form container styling** (port from old Sass, convert to Tailwind):
- `max-w-[550px]`, `mx-auto`, `mt-[1.875rem]`, `mb-[0.9375rem]`
- Border: `border border-[var(--ui-icon)]`, `rounded-[6px]`
- Background: `bg-white`
- Padding: `px-[5%] pt-[1.875rem] pb-[0.9375rem]`

**Form field styling:**
- Labels: `font-heading`, `text-xs` (0.75rem), `font-medium`, `text-[var(--ui-icon)]`, `tracking-[0.05px]`, `mt-[3px]`
- Inputs and textarea: `bg-[#ddd]`, `px-[0.6875rem] py-[0.375rem]`, `text-sm`, `text-[var(--ui-icon)]`, `border-b border-[var(--ui-icon)]`, no other borders, no outline on focus, focus border-bottom switches to `var(--status-success)`
- Error state: border-bottom `var(--status-error)`, focus shadow `rgba(217,83,79,0.1)`
- Error messages: `text-[0.625rem]`, `text-[var(--status-error)]`, `mb-[0.625rem]`, prepend `⚠` via pseudo-element
- Textarea: `resize-y`, `min-h-[7.5rem]`, `leading-[1.5]`
- Button: `bg-[#ddd]`, `text-[var(--ui-icon)]`, `w-[9.375rem]`, `py-[0.625rem]`, `font-heading`, `font-semibold`, `text-base`, `tracking-[0.03em]`, `rounded-[2px]`, hover `translateY(-1px)` transition, disabled `opacity-70 cursor-not-allowed bg-[#999]`
- Alert success: `bg-[rgba(86,186,90,0.1)]`, `border border-[rgba(86,186,90,0.3)]`, `text-[var(--status-success)]`, `rounded-[6px]`, `p-[1rem]`, `flex items-center gap-[0.75rem]`
- Alert error: same pattern with `var(--status-error)` colours
- Alert animation: `slideDown` keyframe (opacity 0→1, translateY -10px→0, 0.3s ease) — port from old Sass

**Do NOT:**
- ❌ Use `<form>` tags — use `<div onKeyDown>` with `onClick` on the button
- ❌ Re-introduce `useArtworks` or `ArtworkProvider` dependency
- ❌ Remove the subject field
- ❌ Remove the `noValidate` pattern

### 3.5 Corrections invitation

A short section below the form. Conditionally rendered if `contactCorrectionsText` is populated.

```
<section>
  <h3>Helping build the record</h3>
  <RichText content={artist.contactCorrectionsText} />
</section>
```

Styling matches the provenance section prose. No form, no CTA beyond the existing form above.

### 3.6 Response note

A single line of plain text. Not a richtext field — hardcoded. Sits between the corrections section and the Impressum.

```tsx
<p className="...">I read everything. I reply when I can.</p>
```

Styling: `font-body`, `text-sm`, `text-[var(--text-muted)]`, `text-center`, `py-[1.875rem]`

### 3.7 ContactImpressum

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
  <RichText content={odrText} />

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

Port and convert the outer container from the old Sass:

```tsx
// Contact.tsx outer container
<section className="
  w-full min-h-screen
  flex flex-col
  bg-[var(--surface-page)]
  px-[10%] pt-[9.375rem] pb-[1.875rem]
  overflow-y-scroll
  [scrollbar-width:none]
  [-ms-overflow-style:none]
  [&::-webkit-scrollbar]:hidden
">
```

Max-width on content: all text sections and the form cap at `550px` centered. The impressum caps at `800px` centered. The outer container goes full width.

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
- Populate `impressum` group
✓ All fields save without error.

**Step 3 — page.tsx**
Replace the existing `app/(public)/contact/page.tsx` with the server component version in Part 2.2. Confirm it fetches and passes artist data correctly.
✓ `console.log(artist)` in the server component shows the full singleton including new fields.

**Step 4 — ContactStatus**
Build and integrate `ContactStatus.tsx`. Test all three status values visually.
✓ Dot colour and label text correct for each value. Component absent when field is null.

**Step 5 — ContactProvenance**
Build `ContactProvenance.tsx`. Test with and without `whatsappNumber` populated.
✓ WhatsApp link present when number is set, absent when not. Richtext renders correctly.

**Step 6 — ContactSocials**
Build `ContactSocials.tsx`. Test with multiple platforms populated and with only one.
✓ Primary channel called out separately. Secondary platforms render as icon row. No empty slots.

**Step 7 — ContactForm**
Port `ContactForm.tsx` from old component. Add subject select. Remove `useArtworks`. Test full submission flow.
✓ Form submits successfully via Formcarry. All three states (submitting, success, error) render correctly. Subject field validates.

**Step 8 — ContactImpressum**
Build `ContactImpressum.tsx`. Confirm all data reads from Payload, nothing hardcoded.
✓ Impressum renders correctly. No hardcoded strings.

**Step 9 — Assembly**
Assemble all sections in `Contact.tsx` in the correct order. Check full page at mobile and desktop.
✓ All sections present, correct order, spacing consistent. Close button fixed top-right.

---

*Contact page spec · bernardbolter.com · June 2026*

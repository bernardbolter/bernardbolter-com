# Bernard Bolter — Design System
*For use by AI agents building and porting components. Read this before writing any styles.*

---

## 1. Philosophy

This site has a hand-coded, artist-made feel. It is **not** a template. Agents should:
- Prefer specificity over utility-class soup
- Respect whitespace as a design decision, not an oversight
- Never normalize artwork display (no uniform grids, no cropping for visual tidiness)
- Treat fixed-position elements (nav, info panel, artwork title) as a layered spatial system — each has a z-index and a position role

---

## 2. Color Tokens

All tokens follow a consistent naming structure:
- `surface-*` — background and face fills
- `text-*` — all text colours  
- `ui-*` — chrome, lines, icons, interactive elements
- `series-*` — artwork series accent colours
- `status-*` — form validation and feedback

**Migration note:** A full old→new token map is in Section 14 at the end of this document.

### Surfaces

| New token | Hex | Old name | Usage |
|---|---|---|---|
| `$surface-page` | `#FDFEFF` | `$background` | Page background, all scroll containers |
| `$surface-nav` | `rgba(255,255,255,.8)` | `$nav-background` | Info panel, name container, switcher |
| `$surface-nav-light` | `rgba(255,255,255,.3)` | `$nav-background-light` | Magnify button background |
| `$surface-title` | `#efefef` | `$title-light` | Title box front face |
| `$surface-side-light` | `#ddd` | `$title-shadow` | Title box lighter side face (top surface) |
| `$surface-side-dark` | `#ccc` | *(new)* | Title box darker side face (right/left surface) |
| `$surface-panel` | `#f4f4f4` | `$art-image-background` | Artwork detail info section |
| `$surface-panel-heading` | `#ddd` | `$art-image-heading` | Section heading bars in detail panel |
| `$surface-panel-odd` | `#eee` | `$art-image-odd` | Alternating row — odd |
| `$surface-panel-even` | `#dedede` | `$art-image-even` | Alternating row — even |

### Text

| New token | Hex | Old name | Usage |
|---|---|---|---|
| `$text-dark` | `#393B3E` | `$dark` | Strongest text — info links, body |
| `$text-medium` | `#464646` | `$medium` | Mid-weight text |
| `$text-light` | `#696969` | `$light` | Tertiary text |
| `$text-primary` | `#444` | `$title-text-dark` / `$art-image-text-dark` | Primary labels — artwork title, CV headers |
| `$text-secondary` | `#666` | `$title-text` / `$art-image-text-light` | Secondary labels — year, medium, size |
| `$text-strong` | `#222` | `$grid-text` | Grid artwork titles |
| `$text-muted` | `#999` | `$grid-text-light` | Muted / secondary grid labels |

### UI Chrome

| New token | Hex | Old name | Usage |
|---|---|---|---|
| `$ui-icon` | `#666` | `$svg-dark` | Icon fills, button icons, form borders |
| `$ui-icon-light` | `#efefef` | `$svg-light` | Icon fills on dark backgrounds, progress ring |
| `$ui-face` | `#eee` | `$svg-face` | Button front face fill |
| `$ui-line` | `#999` | `$art-image-line` | Dividers, seam lines |
| `$ui-highlight` | `#b9b9b9` | `$nav-highlight` | Hover states on nav links |
| `$ui-timeline` | `#878585` | `$timeline` | Timeline line, tick marks, year labels, switcher ball |
| `$ui-filter-text` | `#454565` | `$filter-text` | Filter/sort nav labels |

### Status

| New token | Hex | Old name | Usage |
|---|---|---|---|
| `$status-success` | `#56ba5a` | `$confirmation-color` | Form success |
| `$status-warning` | `#f0ad4e` | `$warning-color` | Form warning |
| `$status-error` | `#d9534f` | `$error-color` | Form error |

### Series Colors

Always retrieved via `getSeriesColor(slug)` — never hardcoded. Used for image placeholder backgrounds, filter dots, title box series indicator dot.

| Slug | New token | Hex | Old var |
|---|---|---|---|
| `a-colorful-history` | `$series-ach` | `#9DC3C2` | `$ach` |
| `art-collision` | `$series-col` | `#99C2A2` | `$col` |
| `digital-city-series` | `$series-dcs` | `#F6BD60` | `$dcs` |
| `megacities` | `$series-meg` | `#FC7753` | `$meg` |
| `breaking-down-art` | `$series-war` | `#6D2E46` | `$war` |
| `vanishing-landscapes` | `$series-van` | `#7B8CDE` | `$van` |
| `og-oil-paintings` | `$series-og` | `#395B0E` | `$og` |
| `installations` | `$series-ins` | `#A27E8E` | `$ins` |
| `photography` | `$series-pho` | `#2D4654` | `$pho` |
| `videos` | `$series-vid` | `#996a3e` | `$vid` |
| `sold` | `$series-sold` | `#d4af37` | `$sold` |

## 3. Typography

### Font Families

Three Google Fonts loaded via `next/font` in `layout.tsx`, exposed as CSS variables:

| CSS variable | Font | Role | Sass mixin |
|---|---|---|---|
| `var(--font-barlow)` | Barlow | Body text, paragraphs, prose | `@include body-font` |
| `var(--font-barlow-condensed)` | Barlow Condensed | Headings (h1–h6), labels, nav items, UI text | `@include heading-font` |
| `var(--font-staatliches)` | Staatliches | Display titles, page header overlays, CV section headers | `@include title-font` |

In Tailwind, map these via `fontFamily` config:
```js
fontFamily: {
  body: ['var(--font-barlow)', 'sans-serif'],
  heading: ['var(--font-barlow-condensed)', 'sans-serif'],
  title: ['var(--font-staatliches)', 'sans-serif'],
}
```

### Type Scale

Extracted from actual usage across `.scss` files. These are real values in use — not aspirational.

| Use case | Size (mobile) | Size (≥550px) | Weight | Font | Class pattern |
|---|---|---|---|---|---|
| Artist name (Info) | 29px | — | 400 (Staatliches inherent) | title | `.name__full` |
| Header overlay (page title) | 60px | 80–150px | 900 | heading | `.header-title__container--large` |
| Header overlay (large) | 120px | 150–220px | 900 | heading | `.header-title__container` |
| Artwork title (detail page) | 22px | 24px | 800 | heading | `.artwork-image__title` |
| Artwork title (ui-timeline box) | 22px | 24px | varies | heading | `.artwork-title__title` |
| CV section header | 18px | 22px | 900 | heading | `.cv__header` |
| CV entry year | 12px | 14–16px | 500 | monospace | `.cv__entry h2` |
| CV entry gallery | 13px | 14–16px | 600 | heading | `.cv__entry h3` |
| Year/medium/size labels | 14px | 16px | 500 | heading | `.artwork-image__year` etc. |
| Size converted (secondary) | 11px | 12px | 200 | heading | `.artwork-size__size--converted` |
| Body prose (bio, statement) | 14px | 18px | 400 | body | `.bio__main-content p` |
| Grid artwork title | 12px | — | 300 | — | `.artwork-grid__info h3` |
| Nav/filter labels | 14px | — | 400–800 | heading | `.filter-nav__name` |
| Info nav links | 19px | — | 700 | heading | `.info-links a` |
| Search matched title | 15px | — | varies | heading | `.search-nav__matched-item h3` |

**Key pattern:** Barlow Condensed handles almost all h1–h6. Barlow handles body prose. Staatliches is used sparingly for large display text and section labels in the artwork detail panel.

### Font Size — rem Conversions

**New components use `rem`, not `px`.** Existing components keep their `px` values during porting — do not refactor them. Use the table below when writing any new component from scratch.

`1rem = 16px` (browser default). The advantage over `px`: users who set a larger browser font size get text that scales with their preference rather than being locked out.

| px value | rem value | Tailwind class | Typical use |
|---|---|---|---|
| 11px | `0.6875rem` | `text-[0.6875rem]` | Converted size labels, fine print |
| 12px | `0.75rem` | `text-xs` | Grid titles, secondary labels, search subtitles |
| 13px | `0.8125rem` | `text-[0.8125rem]` | CV year, contact small text |
| 14px | `0.875rem` | `text-sm` | Body prose (mobile), UI labels, filter names |
| 15px | `0.9375rem` | `text-[0.9375rem]` | Info nav links (secondary) |
| 16px | `1rem` | `text-base` | Standard UI text |
| 18px | `1.125rem` | `text-lg` | Body prose (desktop), CV headers |
| 19px | `1.1875rem` | `text-[1.1875rem]` | Info nav links |
| 22px | `1.375rem` | `text-[1.375rem]` | Artwork title (mobile) |
| 24px | `1.5rem` | `text-2xl` | Artwork title (desktop) |
| 29px | `1.8125rem` | `text-[1.8125rem]` | Artist name |
| 60px | `3.75rem` | `text-[3.75rem]` | Header overlay (mobile) |
| 80px | `5rem` | `text-[5rem]` | Header overlay (≥550px) |
| 120px | `7.5rem` | `text-[7.5rem]` | Large header overlay (mobile) |

**For new components, pick from this shortlist** — don't introduce new sizes:
- Body text: `0.875rem` (14px) mobile → `1.125rem` (18px) desktop
- UI labels: `0.75rem` (12px) or `0.875rem` (14px)
- Component headings: `1rem` (16px) or `1.125rem` (18px)
- Section titles: `1.375rem` (22px) or `1.5rem` (24px)

---

## 4. Spacing & Layout

### Breakpoints

From `vars.scss` — use these **exactly**:

| Name | Value | Tailwind key |
|---|---|---|
| `$break-s` | `550px` | `s` |
| `$break-m` | `768px` | `m` |
| `$break-l` | `979px` | `l` |
| `$break-xl` | `1200px` | `xl` |

In Tailwind config:
```js
screens: {
  's': '550px',
  'm': '768px',
  'l': '979px',
  'xl': '1200px',
}
```

**Do not use default Tailwind breakpoints (`sm`, `md`, `lg`, `xl`).** Always use the custom keys above.

### Spacing Scale

**The rule: `rem` for all spacing, `px` only for borders and strokes.**

`rem` scales with the user's browser font preference. A user who bumps their browser to 20px gets padding and gaps that grow with the text — px values stay fixed and create mismatched layouts. The one exception is hairline details (1px borders, 2px strokes) where sub-pixel rendering makes rem values unreliable.

Base: `1rem = 16px` (browser default).

| Token | rem | px equiv | Use |
|---|---|---|---|
| `space-1` | `0.25rem` | 4px | Micro gaps, icon padding |
| `space-2` | `0.375rem` | 6px | Tight UI gaps, small insets |
| `space-3` | `0.5rem` | 8px | Default inner padding (small) |
| `space-4` | `0.625rem` | 10px | Nav button padding, series dot offset |
| `space-5` | `0.75rem` | 12px | Component padding (compact) |
| `space-6` | `0.875rem` | 14px | Standard gap |
| `space-7` | `1rem` | 16px | Base unit — default padding |
| `space-8` | `1.25rem` | 20px | Section padding, card insets |
| `space-9` | `1.5rem` | 24px | Generous padding |
| `space-10` | `1.875rem` | 30px | Prose spacing, section gaps |
| `space-11` | `2rem` | 32px | Large gaps |
| `space-12` | `3rem` | 48px | Page-level vertical rhythm |

**The rule applies universally — ported and new components alike.** Since the site is being rebuilt with Payload CMS, convert all spacing to rem during porting. If something looks off, adjust the value and update this table. That is the workflow: build → check in browser → update spec → agents re-implement.

**Fixed exceptions** (always px regardless):
- `1px` borders and dividers
- `2px` stroke widths on SVGs and ui-timeline lines
- Corner SVG geometry (10×10px — pixel-precise, never rem)
- Artwork grid gaps (5/7/9/11/13px by breakpoint — integer pixel math required for column calculation)

In Tailwind config, extend spacing with these values or use arbitrary values like `p-[0.875rem]` for exact matches.

### Spacing conversion reference (old px → rem)

When porting existing components, map their px values to the nearest scale token:

| Context | Old value | Scale token |
|---|---|---|
| Info panel left padding | `7px` | `space-2` (0.375rem) |
| Component inner padding | `10px` | `space-4` (0.625rem) |
| Component padding standard | `14px` | `space-6` (0.875rem) |
| Prose paragraph gap | `30px` | `space-10` (1.875rem) |
| Bio/Statement page padding | `5%` mobile | keep as `5%` (viewport-relative) |
| Page-level scroll padding | `50px` | `space-12` (3rem) approx |

### Z-Index Layers

**Clean system — use named layers, never arbitrary values.**

The old codebase had values like 1999, 2001, 3001, 3002, 5001, 6001, 8000 — the result of nudging components past each other one at a time. The new system uses round numbers with 1000-unit gaps so anything can be inserted without creating a new arbitrary value.

| Layer name | Value | What lives here |
|---|---|---|
| `z-base` | 0 | Normal document flow |
| `z-artwork` | 1000 | Artwork images, ui-timeline content |
| `z-chrome` | 2000 | Info panel, name container, info content |
| `z-nav` | 3000 | Title box, magnify button, artwork image controls |
| `z-overlay` | 4000 | Slideshow, filter drawer, search drawer, switcher |
| `z-ui-top` | 5000 | Close buttons, nav buttons |
| `z-modal` | 9000 | Lightbox, Klaro cookie modal |

**Within a layer**, use `+1` for stacking order within the same group (e.g. info button background at `z-chrome`, info button itself at `z-chrome + 1`). Never jump to the next layer just to clear a conflict — find the right layer first.

**Mapping old values to new layers:**

| Old value | Component | New value |
|---|---|---|
| 1999 | Info button background | `z-chrome` (2000) |
| 2000 | Name container, info content | `z-chrome` (2000) |
| 2001 | Info button | `z-chrome + 1` (2001) |
| 3000 | Artwork title box | `z-nav` (3000) |
| 3001 | Magnify button | `z-nav + 1` (3001) |
| 3002 | Artwork image buttons | `z-nav + 2` (3002) |
| 4000 | Slideshow | `z-overlay` (4000) |
| 4001 | Artwork switcher | `z-overlay + 1` (4001) |
| 5001 | Nav container | `z-ui-top` (5000) |
| 6001 | Artwork image close button | `z-ui-top + 1` (5001) |
| 8000 | Artwork title in slideshow | `z-modal - 1` (8999) — must be above overlay but below modal |
| 10000 | Lightbox overlay, Klaro | `z-modal` (9000) |
| 10001 | Lightbox controls | `z-modal + 1` (9001) |

In Tailwind config:
```js
zIndex: {
  'artwork': '1000',
  'chrome':  '2000',
  'nav':     '3000',
  'overlay': '4000',
  'ui-top':  '5000',
  'modal':   '9000',
}
```

**New components must pick a layer by purpose, not by trial and status-error.** If something isn't appearing above what it should, the answer is to check which layer the blocking element is in and respond accordingly — not to add 9999.

---

## 5. Responsive Behaviour

Responsiveness on this site is not just breakpoint tweaks — several components make **architectural shifts** at key widths. Agents must understand these structural changes, not just apply media query classes.

### The four breakpoints (repeated for emphasis)

| Key | Width | Major shifts |
|---|---|---|
| default | 0px | Mobile layout — vertical scroll, 1 column grid |
| `s:` | 550px | Grid → 2 columns, switcher appears, some spacing increases |
| `m:` | 768px | **Major shift** — timeline flips axis, artwork container formula changes, title box mode changes |
| `l:` | 979px | Grid → 4 columns, some page padding widens |
| `xl:` | 1200px | Grid → 5 columns |

---

### Major structural shift at 768px

This is the most important breakpoint on the site. Multiple components make architectural changes here, not just visual tweaks.

**Timeline view:**
- Mobile (< 768px): **vertical scroll**, artworks stacked top-to-bottom, timeline line runs vertically on the left
- Desktop (≥ 768px): **horizontal scroll**, artworks laid out left-to-right, timeline line runs horizontally along the bottom
- The scroll container switches from `overflow-y: scroll` to `overflow-x: scroll`
- `flex-direction` switches from `column` to `row` on the artworks container
- Arrow controls only appear on desktop — hidden on mobile

**Artwork container dimensions:**
- Mobile: `width = viewport.width - 50px`, `height = viewport.width - 50px` (square, based on width)
- Desktop: `width = viewport.height - 125px`, `height = viewport.height - 125px` (square, based on height)
- This feeds directly into `useArtworkDimensions` — the container size is the basis for all artwork display calculations
- Set in `ArtworksTimeline` via `setArtworks` and stored in provider state

**Title box mode:**
- < 768px → `--mobile` mode (bottom-right anchor, left+bottom side faces visible)
- ≥ 768px → `--desktop` mode (top-right anchor, top+right side faces visible)
- Slideshow mode overrides both regardless of viewport width

**Desktop side width:**
- Desktop only: `artworkDesktopSideWidth = (viewport.width - (viewport.height - 125)) / 2`
- This is the blank space on each side of the artwork in timeline view, centering it horizontally
- Mobile: `artworkDesktopSideWidth = 0`

---

### Grid responsiveness

The masonry grid column count and gap size change at every breakpoint:

| Breakpoint | Columns | Gap |
|---|---|---|
| default | 1 | 5px |
| `s:` 550px | 2 | 7px |
| `m:` 768px | 3 | 9px |
| `l:` 979px | 4 | 11px |
| `xl:` 1200px | 5 | 13px |

Max grid width: 1500px. Gap values are integers (px) — these feed into pixel-precise column width calculation and must stay as px.

Grid is hidden on mobile (<550px) — only timeline view is available at that width. The switcher component is also hidden below 550px.

---

### Component-level responsive behaviour

**Info panel:**
- Layout is the same across all widths — fixed left, slides in/out
- Social icons switch from `flex-direction: row` (mobile) to `flex-direction: column` (≥550px)

**Navigation bar:**
- `top` position changes based on view:
  - Grid view or slideshow: `top: 4px`
  - Timeline view desktop: `top: 130px` (pushed down to clear the timeline strip)
  - Timeline view mobile: `top: 4px`

**Filter nav:**
- `top` position: `79px` mobile, `204px` desktop timeline view (pushed down further)
- `max-height` is viewport-relative to prevent overflow

**Search nav:**
- `top: 9px` mobile, `135px` desktop timeline view

**Close buttons** — top position per page per breakpoint (these are all fixed-position):

| Page | Default | ≥550px | ≥768px | ≥979px |
|---|---|---|---|---|
| CV | `49px` | `65px` | `88px` | `105px` |
| Contact | `50px` | `58px` | `89px` | `100px` |
| Statement | `45px` | `62px` | `79px` | `108px` |
| Bio | `80px` | `103px` | `130px` | `135px` |

**Bio/Statement page padding** — switches from percentage to calculated value:
- Mobile: `padding: 0 5%`
- ≥768px: `padding: 0 calc((100vw - 650px) / 2)`
- ≥979px: `padding: 0 calc((100vw - 800px) / 2)`

**CV content:**
- Mobile: `width: 90%, margin: 135px 5% 50px`
- ≥550px: `width: 84%, margin: 120px 8%`
- ≥768px: `width: 78%, margin: 140px auto 140px 150px, max-width: 800px`
- ≥979px: `margin: 140px 2% 100px 20%`

**Header overlay title** (Bio, CV, Statement decorative background text):
- Scales across all four breakpoints — see type scale table in Section 3

---

### Typography responsiveness

| Element | Mobile | ≥550px | ≥768px+ |
|---|---|---|---|
| Body prose | `0.875rem` (14px) | `1.125rem` (18px) | `1.125rem` |
| Artwork title | `1.375rem` (22px) | `1.5rem` (24px) | `1.5rem` |
| Year / medium / size | `0.875rem` (14px) | `1rem` (16px) | `1rem` |
| Size converted | `0.6875rem` (11px) | `0.75rem` (12px) | `0.75rem` |
| Header overlay (large) | `7.5rem` (120px) | `9.375rem` (150px) | up to `13.75rem` (220px) |
| Header overlay (small) | `3.75rem` (60px) | `5rem` (80px) | up to `9.375rem` (150px) |

---

### What NOT to do responsively

- ❌ Using `overflow: hidden` on any scroll container — all page-level containers use `overflow: scroll` with hidden scrollbars
- ❌ Showing the grid below 550px — timeline only at that width
- ❌ Showing the switcher below 550px — hidden there
- ❌ Using default Tailwind breakpoints (`sm:`, `md:`, `lg:`) — always `s:`, `m:`, `l:`, `xl:`
- ❌ Hardcoding artwork container dimensions — they must be calculated from viewport and stored in provider state, then passed to `useArtworkDimensions`
- ❌ Applying the same title box mode at all widths — mode must switch at 768px
- ❌ Showing desktop arrow controls on mobile — they only render above 768px

---

## 6. Artwork Sizing — THE CRITICAL SYSTEM

This is the most important design constraint on the site. Read carefully.

### The Principle

Artworks are displayed at sizes that **represent their real-world physical scale**. A large canvas feels larger on screen than a small one. Do not normalize image sizes to fill containers uniformly.

### Size Tiers

Each artwork in the CMS has a `size` field with four values:

| CMS value | Meaning | Factor (landscape/portrait) | Factor (square) |
|---|---|---|---|
| `xl` | Large-scale works | 0.95 | 0.90 |
| `lg` | Large (default) | 0.85 | 0.80 |
| `md` | Medium | 0.75 | 0.70 |
| `sm` | Small works | 0.65 | 0.60 |

When `useImageFactors: true` (used on single artwork pages where the image fills more of the screen), factors are: xl=0.95, lg=0.90, md=0.85, sm=0.80.

### Orientation

The image's intrinsic pixel dimensions determine orientation:
- `aspectRatio > 1` → **landscape**: width is the constraining dimension
- `aspectRatio < 1` → **portrait**: height is the constraining dimension  
- `aspectRatio === 1` → **square**: both constrained, uses square factors

### The Container

On desktop (≥ 768px): container = `viewport height - 125px` (square — same width and height).
On mobile (< 768px): container = `viewport width - 50px` (square).

The container is always square. The artwork is placed within it, respecting both its factor and its aspect ratio.

### Implementation

All sizing goes through `useArtworkDimensions` hook:
```ts
const { displayWidth, displayHeight } = useArtworkDimensions({
  artworkContainerWidth,   // from provider or local calc
  artworkContainerHeight,  // from provider or local calc
  imageWidth,              // intrinsic pixel width from CMS
  imageHeight,             // intrinsic pixel height from CMS
  artworkSize,             // 'sm' | 'md' | 'lg' | 'xl' — from CMS
  useImageFactors,         // true on single artwork page, false on ui-timeline/grid
})
```

**Do NOT:**
- Use `object-cover` or `object-fill` anywhere artworks are displayed
- Normalize display dimensions to fill grid cells
- Skip the size/orientation logic for "simplicity"
- Duplicate this logic — always use the hook

**DO:**
- Use `object-fit: contain` on all artwork images
- Pass `displayWidth` and `displayHeight` directly as `width` and `height` props on `<Image>`
- Use series color as `backgroundColor` on the image container (visible during load)

---

## 7. Component Patterns

### Fixed Left Panel: Info / Name

The Info system is a fixed left-side panel that opens/closes via hamburger.

```
[Name container — fixed, top:0, left:0, z:2000]
  Bernard Bolter (Staatliches, 29px)
  b. San Francisco, 1974 (Barlow Condensed, 14px, weight 300)
  Lives and works... (14px, weight 300)

[Info button background — fixed, top:79px, z:1999]
[Info button — fixed, 50x50, z:2001]
  AnimatedHamburgerMenu (3-line → X animation)

[Info content — fixed, top:129px, z:2000, slides in from left]
  Info websites (link + label rows)
  Divider (30px wide, 1px, $text-dark)
  Nav links (Barlow Condensed, 19px, weight 700)
  Divider
  Social icons (30x30 each)
```

**Behavior:** `infoOpen` state controls `translateX(-169px)` ↔ `translateX(0)` transition, `all .5s ease-in-out`.

### Fixed Right Column: Nav

All nav buttons stack vertically on the right edge.

```
[Nav container — fixed, right:0, z:5001]
  [Timer button — visible in slideshow only]
  [Search button — hidden in slideshow]
  [SearchNav — slides in from right when open]
  [Play/Pause button — always visible]
  [Filter button — hidden in slideshow]
  [FilterNav — slides in from right when open]
  [Pause button — visible in slideshow only]
```

Each nav button is 33×34px. SVGs fill their container. Opacity ~0.9 at rest.

Nav `top` position changes based on view:
- Grid view / slideshow: `top: 4px`
- Timeline view (desktop): `top: 130px`

### Artwork Title Box — 3D Box Illusion

This is the most distinctive UI element on the site. It reads as a physical box rising out of the screen plane — like a label peeling up from the surface. It is the one place the design goes decorative, and it must be preserved exactly.

#### How the illusion works

The box is built from three colour values working together:

- `$surface-title` (#efefef) — the **front face** of the box
- `$surface-side-light` (#ddd) — the **lighter side face** (top surface in desktop mode)
- `$surface-side-dark` (#ccc) — the **darker side face** (right or left surface depending on mode)

No border strokes are used — the 3D effect comes entirely from colour contrast between the three surfaces. All three are CSS variables so you can adjust the values after components are built and compare in browser.

Each corner is a 10×10px SVG. Inside each SVG, a `<polygon>` fills the front-face colour into a triangle, a second `<polygon>` fills the side-face colour into the opposite triangle, and `<line>` elements draw the seams. The diagonal line cutting corner-to-corner **is the 3D corner of the box** — the point where front face meets side face as it recedes into the screen plane.

Two side face strips run along the visible edges — one `$surface-side-light` (#ddd) strip and one `$surface-side-dark` (#ccc) strip. **The colour contrast between these two and the front face is what makes the box read as 3D** — no border strokes needed. Which edges carry which strip determines the apparent viewing angle and which screen corner the box appears to project from.

#### The three modes

| Mode | Position | Shadow strip | Box reads as... | Class modifier |
|---|---|---|---|---|
| Desktop | `top:0, right:1px` | Right edge + bottom edge | Rising from top-right, lit from left | `--desktop` |
| Mobile | `right:0, bottom:0` | Left edge + top edge | Rising from bottom-right, lit from right | `--mobile` |
| Slideshow | `left:0, bottom:0` | No shadow strip — inverted palette | Same geometry, dark face (#666), light text (#efefef) | `--slideshow` |
| Grid view | Hidden | — | — | `--hide` |

#### Critical rules for agents

**Do not alter the corner SVG geometry.** The diagonal is fixed — it is always the 3D corner seam. The perspective direction is controlled entirely by which CSS edge carries the shadow-coloured strip.

**Do not use `border-radius`.** The corners are custom SVGs. Rounded corners would break the 3D illusion entirely.

**The corner SVGs are aware of view state.** Each of the four `TitleCorner*.tsx` components reads `artworks.showSlideshow` and `size.width` and renders different polygon/line combinations per mode. They also read `--title-face`, `--title-side-light`, `--title-side-dark`, and `--text-secondary` from CSS custom properties at runtime via `getComputedStyle` — those CSS variables must remain in `:root`.

**The geometry is approximately right in code — final pixel tweaks are done by eye in the browser.** Do not attempt to re-derive the corner SVG coordinates from first principles. Port them verbatim.

#### Content inside the box

- Artwork title: Barlow Condensed, 22–24px, weight 800, `$text-primary` (#444)
- Year, medium, size: Barlow Condensed, 14–16px, weight 500, `$text-secondary` (#666)
- Series colour dot: 15×15px circle, `border-radius: 50%`, absolute positioned bottom-right of content area
- In slideshow mode: all text becomes `$title-light` (#efefef), face becomes `$text-secondary` (#666)

### Artwork Detail (Timeline Thumbnail)

- Wraps `<Link href="/{slug}">` → `<div>` with explicit `width` and `height` from `useArtworkDimensions`
- Background color = series color (shows during load)
- `object-fit: contain`
- Hover: `box-shadow: rgba(0,0,0,0.3) 4px 4px 4px`
- PlayButtonSvg overlaid (centered, absolute) for video items

### Artwork Grid Image

- Container: `position: relative`, `width: itemSize.width`, `paddingBottom: 49px` (for info row below)
- Image wrapper: horizontally centered within container using `marginLeft/marginRight` calculated from `(itemSize.width - finalWidth) / 2`
- Info row: absolutely positioned, `right:0, bottom:-18px`, flex row with series dot (10×10px circle) and title (12px, weight 300)
- Image: `object-fit: contain`, lazy loaded

### Close Buttons

All pages have a fixed close button at top-right. Pattern:
- `position: fixed`, `right: 0`, `z-index: 5001`
- Contains `<CloseCircleSvg />` (30–42px) + `<p>close</p>` (10px, Staatliches or Barlow Condensed, weight 300)
- Opacity 0.6 at rest, 0.9 on hover, transition `0.3s ease-in-out`
- Top position varies by breakpoint: 45–135px depending on page

### Header Title Overlay

Large decorative text overlaid at top-right corner of static pages.

```scss
// Small version (CV, Contact, Statement uses `large=true` prop → smaller actual font)
.header-title__container--large {
  position: fixed; top: -15px; right: -7px;
  font: Barlow Condensed, 60–150px, weight 900, uppercase
  opacity: 0.6
  animation: colorChange 6s ease-in-out infinite
  // colorChange: cycles #D8D8D8 → #E2E2E2 → #ECECEC
}

// Large version (Bio uses `large=false` → the bigger font)
.header-title__container {
  position: fixed; top: -30px; right: -30px;
  font: Staatliches, 120–220px, weight 900
}
```

### Filter / Sort Nav

Slides in from right. Width 174px. `border-bottom-left-radius: 22px`. Background `$ui-icon-light` (#efefef). Contains Sort section (3 options) and Filters section (11 series + available toggle). Each item: flex row, label right-aligned, color dot (20×20px).

Active state: `font-weight: 800` (not a color change).

### Switcher (Timeline ↔ Grid)

Pill toggle, fixed, centered top. Contains "Timeline" text, 50×20px sliding ball track, "Grid" text. Ball slides via `transform: translateX(30px)`. Only shown on ≥550px viewports. Hidden during slideshow.

### Loading / No Artworks

Both use the same floating radial gradient orb animation. Six series-colored orbs (450–600px, blur 70px, 20% opacity) float on `$surface-page`. Plain uppercase text centered. No component framework — inline styles only (these predate the Tailwind migration and should stay as-is during porting).

---

## 8. Animation Patterns

### Page Transitions

`AnimationWrapper` uses Framer Motion:
- Entry: `opacity: 0 → 1`, duration 0.5s, `easeInOut`
- Exit: `opacity: 1 → 0`, duration 0.2s, `easeOut`
- Mode: `wait` (exit completes before entry begins)
- Background: `#FDFEFF` (matches `$surface-page`) to prevent flash

### Info Panel

`transform: translateX(-169px) → translateX(0)`, `all .5s ease-in-out`

Width of background container also animates: `50px → 149px`, same duration.

### SVG Button Icons

Most nav buttons use SVG icons with dual-state fills controlled by CSS classes:
- `.svgs-light-fill` → `fill: #efefef`
- `.svgs-dark-fill` → `fill: #666`
- `.svgs-face-fill` → `fill: #eee`
- `.svgs-dark-stroke` → `stroke: #666`

Opacity transitions on hover: `0.9 → 1.0`, `0.3s ease-in-out`.

### Timeline Scroll

The ui-timeline is a scrollable container (`overflow: scroll`, `scrollbar-width: none`). On desktop: horizontal scroll. On mobile: vertical scroll. Programmatic scrolls use `behavior: 'smooth'`. A ref flag (`isProgramScroll`) prevents scroll handlers from interfering with programmatic navigation.

### Slideshow Autoplay Timer

SVG circle with `strokeDashoffset` driven by a `requestAnimationFrame` loop updating a progress value 0–100. Timer resets on image load. Pause/play toggle preserves progress position.

---

## 9. Tailwind Configuration

### `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    screens: {
      's': '550px',
      'm': '768px',
      'l': '979px',
      'xl': '1200px',
    },
    extend: {
      colors: {
        // Core
        surface-page: '#FDFEFF',
        dark: '#393B3E',
        medium: '#464646',
        light: '#696969',
        // UI Chrome
        'ui-icon': '#666',
        'ui-icon-light': '#efefef',
        'ui-face': '#eee',
        'surface-nav': 'rgba(255,255,255,0.8)',
        'surface-nav-light': 'rgba(255,255,255,0.3)',
        'ui-highlight': '#b9b9b9',
        'ui-timeline': '#878585',
        'ui-filter-text': '#454565',
        // Title block
        'surface-title': '#efefef',
        'surface-side-light': '#ddd',
        'surface-side-dark': '#ccc',
        'text-secondary': '#666',
        'text-primary': '#444',
        // Artwork detail panel
        'surface-panel': '#f4f4f4',
        'ui-line': '#999',
        'text-secondary': '#666',
        'text-primary': '#444',
        'surface-panel-heading': '#ddd',
        'surface-panel-even': '#dedede',
        'surface-panel-odd': '#eee',
        // Grid
        'text-strong': '#222',
        'text-strong-light': '#999',
        // Status
        status-success: '#56ba5a',
        status-warning: '#f0ad4e',
        status-error: '#d9534f',
        // Series (use getSeriesColor() helper — these are for reference only)
        'series-ach': '#9DC3C2',
        'series-col': '#99C2A2',
        'series-dcs': '#F6BD60',
        'series-meg': '#FC7753',
        'series-war': '#6D2E46',
        'series-van': '#7B8CDE',
        'series-og': '#395B0E',
        'series-ins': '#A27E8E',
        'series-pho': '#2D4654',
        'series-vid': '#996a3e',
        'series-sold': '#d4af37',
      },
      fontFamily: {
        body: ['var(--font-barlow)', 'sans-serif'],
        heading: ['var(--font-barlow-condensed)', 'sans-serif'],
        title: ['var(--font-staatliches)', 'sans-serif'],
      },
      maxWidth: {
        'grid': '1500px',
      },
    },
  },
  plugins: [],
}

export default config
```

---

## 10. CSS Variable Bridge

These CSS variables are set in `:root` (from `vars.scss`) and read in some components via `getComputedStyle`. Do not remove them:

```css
:root {
  --dark-color: #393B3E;
  --light-color: #696969;
  --medium-color: #464646;
  --status-success-color: #56ba5a;
  --status-warning-color: #f0ad4e;
  --status-error-color: #d9534f;
  --ui-highlight: #b9b9b9;
  --surface-title: #efefef;
  --surface-side-light: #ddd;
  --surface-side-dark: #ccc;
  --title-space: 15px;

  --text-secondary: #666;
}
```

These are referenced at runtime by: `ArtworkSize.tsx` (reads `--text-secondary`, `--title-light`), `TitleCorner*.tsx` components (reads `--title-dark`, `--title-shadow`, `--text-secondary`), `ArtworkVideo.tsx` (reads `--page-background-color`).

When porting to Tailwind, keep these in `globals.css`. Do not rely on Tailwind CSS variables for these — they must be readable via `getComputedStyle`.

---

## 11. Button SVG Language

The nav buttons (Play, Pause, Filter, Search, Left/Right arrows, Artwork Pause) share a visual language that is the same 3D box principle as the title box — a front face and a side face create the illusion of a physical button sitting on the screen.

### Construction

Every button SVG uses a `52×50` viewBox and is built from three layers:

**Layer 1 — Shadow/back shape** (bottom-right offset, gives depth):
```svg
<path d="M43.8242 44.5L50.0742 49.5H8.6582L1.5752 44.5H43.8242Z
         M51 11.6484V48.959L44.5 43.7588V1.68164L51 11.6484Z"
  className="svgs-dark-stroke svgs-light-fill" />
```
This is a parallelogram/wedge shape offset ~6px right and ~5px down from the face. Fill: `$ui-icon-light` (#efefef). Stroke: `#999` (`$title-dark`). This is the **side face** of the 3D button — lighter stroke so it reads as receding rather than forward.

**Layer 2 — Front face**:
```svg
<path d="M0 6L6 0H44V44H0V6Z"
  className="svgs-face-fill" />
```
A rectangle with a single chamfered top-left corner (the `6 0` point). Fill: `$ui-face` (#eee). This is the **front face** — very slightly darker than the shadow shape so both read as distinct surfaces.

**Layer 3 — Icon** (on top of the face):
The actual symbol — arrow, play triangle, search glass, filter sliders — filled `$ui-icon` (#666). This is intentionally darker than the shadow stroke (#999) so the icon reads as the most prominent element.

### The chamfered corner

The `M0 6 L6 0` in the face path cuts the top-left corner diagonally — the same device as the title box corners. It reads as the corner of the box where the top face meets the front face. It is always top-left on these buttons because they sit on the right edge of the screen and appear to project leftward.

### State changes

Icons swap internal paths rather than changing the button shell. The shell (layers 1 and 2) is always identical. Examples:
- Filter button: filter icon ↔ arrow icon (opacity toggle on two `<path>` elements)
- Search button: magnifier icon ↔ arrow icon (same pattern)
- Play button: triangle ↔ square (pause) (opacity toggle on three elements)
- The shell never changes — only the icon layer

### Active / state fill

The face fill can change to signal state:
- `$ui-face` (#eee) — rest state
- `#FFE6D2` (`.ui-face-fill-filtered` class) — filter is active, face tints warm
- `$ui-icon-light` (#efefef) — selected/active state on some buttons

### Rules for agents

- **Do not redesign the button shell.** The 52×50 viewBox, the shadow path, and the chamfered face are fixed. Only add new icon paths inside the face area.
- **Do not use CSS `border-radius` on these buttons.** The 3D effect comes from the SVG geometry.
- **New icons must fit within the face path bounds** — approximately x:2–42, y:2–42.
- **Match the existing CSS classes** (`svgs-dark-stroke`, `svgs-light-fill`, `svgs-face-fill`, `svgs-dark-fill`) rather than hardcoding fill/stroke values. These classes are defined in `svgs.scss` and ensure consistent dark/light theming.

---

## 12. Provisional Systems

*These systems apply to new components built during the Payload CMS rebuild. They are intentional defaults — not retrofitted onto existing components. After the first implementation pass, adjust values here and agents will implement from the updated spec.*

### How to use this section

When building a new component:
1. Pick font sizes from the rem table in Section 3
2. Pick spacing from the scale in Section 4
3. Pick a z-index layer by purpose from Section 4
4. After seeing it in browser — update this section if anything feels off

When something feels wrong in browser (text too small, spacing too tight, z-index conflict), **update the design system first, then have agents re-implement**. Do not patch individual components and let the spec drift from reality.

### New component checklist

Before submitting any new component for review:
- [ ] Font sizes in `rem`, not `px`
- [ ] Spacing in `rem`, not `px` (except 1–2px borders and SVG strokes)
- [ ] Z-index from named layer table, not an arbitrary value
- [ ] No default Tailwind breakpoints (`sm:`, `md:`) — only `s:`, `m:`, `l:`, `xl:`
- [ ] Scrollable containers have `scrollbar-width: none` + webkit equivalent
- [ ] Series colors via `getSeriesColor()`, not hardcoded
- [ ] Artwork images via `useArtworkDimensions`, not hardcoded dimensions
- [ ] No `object-cover` on artwork images

### What to update after first implementation

These values are best-guess until confirmed in browser:

| Item | Current assumption | Update after seeing in browser |
|---|---|---|
| Body prose size desktop | `1.125rem` (18px) | |
| Standard UI label size | `0.875rem` (14px) | |
| Default component padding | `1rem` (16px) | |
| Section vertical gap | `1.875rem` (30px) | |
| Title box pixel geometry | Approximately correct | Fine-tune corner SVG coords by eye |
| `--title-box-max-width-desktop` | `180px` | Adjust after testing in browser |
| `--title-box-max-width-mobile` | `180px` | Adjust after testing in browser |
| `--title-box-max-width-slideshow` | `220px` | Adjust after testing in browser |
| `--title-box-max-width-dark` | `180px` | Adjust after testing in browser |

---

## 13. What NOT to Do

**Image display:**
- ❌ `object-cover` on any artwork image
- ❌ Uniform grid cells that force all artworks to the same visual size
- ❌ Hardcoding width/height without going through `useArtworkDimensions`
- ❌ Skipping series background color on image containers

**Typography:**
- ❌ Using Barlow for headings or Barlow Condensed for body prose
- ❌ Using Staatliches for anything other than large display and panel section labels
- ❌ Adding `text-transform: uppercase` globally — Staatliches mixin includes it, others don't

**Layout:**
- ❌ Breaking z-index order — use named layers (`z-chrome`, `z-nav`, `z-overlay`, `z-ui-top`, `z-modal`), never arbitrary values
- ❌ Using `overflow: hidden` on scroll containers (artworks-ui-timeline, bio, cv, statement all use `overflow: scroll` with hidden scrollbars)
- ❌ Using default Tailwind breakpoints (`sm:`, `md:`, `lg:`) — use `s:`, `m:`, `l:`, `xl:`
- ❌ Adding scrollbars (`scrollbar-width: none` and `::-webkit-scrollbar: none` should be on all page-level scroll containers)
- ❌ Using `px` for font sizes or spacing — use `rem` everywhere (exceptions: 1-2px borders, SVG strokes, grid gap integers)

**Components:**
- ❌ Duplicating artwork sizing logic — always use the hook
- ❌ Hardcoding series colors in JSX — always use `getSeriesColor(slug)`
- ❌ Removing the `isProgramScroll` ref guard on ui-timeline scroll handlers
- ❌ Using `<form>` tags — use div + onClick handlers

---

## 14. File Map

```
src/
  styles/
    vars.scss           ← all tokens (source of truth until full Tailwind migration)
    fonts.scss          ← font mixins
    base.scss           ← reset
    index.scss          ← imports all partials
    [component].scss    ← one file per component
  helpers/
    seriesColor.ts      ← getSeriesColor(slug) — always use this
    blurURLs.ts         ← series-matched blur placeholder data URLs
    getGridItemContainerSize.ts ← grid column width calc
  hooks/
    useArtworkDimensions.tsx ← THE sizing hook — use for all artwork display
    useWindowSize.tsx   ← viewport dimensions
  providers/
    ArtworkProvider.tsx ← global state: artworks, filters, view mode, dimensions
```

---


---

## 14. Token Migration Map

When porting old Sass/WordPress components, use this table to map old variable names to new tokens. Find the old name in the left column, use the new token on the right.

| Old Sass variable | New token | Hex |
|---|---|---|
| `$background` | `$surface-page` | `#FDFEFF` |
| `$nav-background` | `$surface-nav` | `rgba(255,255,255,.8)` |
| `$nav-background-light` | `$surface-nav-light` | `rgba(255,255,255,.3)` |
| `$title-light` | `$surface-title` | `#efefef` |
| `$title-shadow` | `$surface-side-light` | `#ddd` |
| `$title-dark` | `$ui-line` | `#999` |
| `$art-image-background` | `$surface-panel` | `#f4f4f4` |
| `$art-image-heading` | `$surface-panel-heading` | `#ddd` |
| `$art-image-odd` | `$surface-panel-odd` | `#eee` |
| `$art-image-even` | `$surface-panel-even` | `#dedede` |
| `$dark` | `$text-dark` | `#393B3E` |
| `$medium` | `$text-medium` | `#464646` |
| `$light` | `$text-light` | `#696969` |
| `$title-text-dark` | `$text-primary` | `#444` |
| `$title-text` | `$text-secondary` | `#666` |
| `$art-image-text-dark` | `$text-primary` | `#444` |
| `$art-image-text-light` | `$text-secondary` | `#666` |
| `$grid-text` | `$text-strong` | `#222` |
| `$grid-text-light` | `$text-muted` | `#999` |
| `$svg-dark` | `$ui-icon` | `#666` |
| `$svg-light` | `$ui-icon-light` | `#efefef` |
| `$svg-face` | `$ui-face` | `#eee` |
| `$art-image-line` | `$ui-line` | `#999` |
| `$nav-highlight` | `$ui-highlight` | `#b9b9b9` |
| `$timeline` | `$ui-timeline` | `#878585` |
| `$filter-text` | `$ui-filter-text` | `#454565` |
| `$confirmation-color` | `$status-success` | `#56ba5a` |
| `$warning-color` | `$status-warning` | `#f0ad4e` |
| `$error-color` | `$status-error` | `#d9534f` |
| `$ach` | `$series-ach` | `#9DC3C2` |
| `$col` | `$series-col` | `#99C2A2` |
| `$dcs` | `$series-dcs` | `#F6BD60` |
| `$meg` | `$series-meg` | `#FC7753` |
| `$war` | `$series-war` | `#6D2E46` |
| `$van` | `$series-van` | `#7B8CDE` |
| `$og` | `$series-og` | `#395B0E` |
| `$ins` | `$series-ins` | `#A27E8E` |
| `$pho` | `$series-pho` | `#2D4654` |
| `$vid` | `$series-vid` | `#996a3e` |
| `$sold` | `$series-sold` | `#d4af37` |

*Last updated: Token naming system overhauled — surface/text/ui/series/status structure. Migration map added.*


# Artwork Backup & File Organisation System
## Bernard Bolter · May 2026

---

## Core Principles

Every series follows the same two-folder skeleton:

```
[series-name]/
├── series/       — assets belonging to the series as a whole
└── artworks/     — one folder per artwork, named with internal ID
```

**The artwork is always the unit.** Move or archive a work and all its files travel with it.

---

## Naming Convention

| Context | Format | Example |
|---|---|---|
| Artwork folder | `[CODE]-[NUMBER]-[title-slug]` | `ACH-001-cliff-house-1863` |
| Source files | Match folder name | `ACH-001-cliff-house-1863.psd` |
| CMS internal slug | Lowercase, matches folder | `ach-001-cliff-house-1863` |
| Public web URL | Title only, no prefix | `/cliff-house-1863` |

Numbers are flat sequential within each series. No year prefix.

### Series Codes

| Series | Code |
|---|---|
| A Colorful History | ACH |
| Digital City Series | DCS |
| Megacities | MEG |
| Art Collision | COL |
| Vanishing Landscapes | VAN |
| Oil Paintings | OIL |
| Watercolors | WAT |
| Drawings | DRW |
| Videos | VID |
| Performances | PER |

---

## Backup Tiers

| Tier | What | Where |
|---|---|---|
| ☁️ Cloud | Irreplaceable source files | Cloud storage (e.g. Backblaze, iCloud, Google Drive) |
| R2 | Web-ready delivery files | Cloudflare R2 — this IS the backup, no duplicate needed |
| 💾 Dual drive | Large or re-scrappable files | Two physical hard drives in separate locations |
| 🔁 Regeneratable | Derived outputs | Make when needed from source + template |

**Rule:** if something can be regenerated from a source file + a template, don't back it up — back up the source and the template instead.

---

## Series Structures

---

### A Colorful History (ACH)

Mixed media paintings — acrylic photo transfers onto canvas.

```
a-colorful-history/
├── series/
│   ├── historical-photo-library/
│   │   ├── san-francisco/
│   │   ├── new-york/
│   │   └── _unsorted/
│   ├── concepts/
│   ├── exhibition-assets/
│   │   ├── event-photos/
│   │   ├── print-materials/
│   │   └── submissions/
│   ├── texts/
│   └── templates/
│       └── print-template.psd              ☁️ cloud
│
└── artworks/
    └── ACH-001-cliff-house-1863/
        ├── ACH-001-cliff-house-1863.psd    ☁️ cloud
        ├── source/
        │   ├── source-01.jpg               💾 dual drive (historical — findable online)
        │   └── source-02.jpg               💾 dual drive
        ├── web/
        │   └── ACH-001-cliff-house-1863.jpg   local copy, R2 is master
        ├── ar/
        │   └── ACH-001-cliff-house-1863.mp4   local copy, R2 is master
        └── source-images/
            └── ACH-001-cliff-house-1863-src-01.jpg   local copy, R2 is master
```

**Cloud backup per artwork:** PSD only.
**Print files:** regenerate from PSD + print template when needed.
**Source photos:** dual drive only — historical ones findable online, personal photos double-backed on drives.

---

### Digital City Series (DCS)

Photographic compositions from skate missions — each city is a triptych: composition + satellite + selected capture photo.

```
digital-city-series/
├── series/
│   ├── books/
│   ├── exhibition-assets/
│   ├── texts/
│   ├── videos/
│   ├── web-archive/
│   ├── documents/
│   └── templates/
│       └── print-template.psd              ☁️ cloud
│
└── artworks/
    └── DCS-001-basel/
        ├── DCS-001-basel-comp.psd          ☁️ cloud  (master composition, all layers)
        ├── source/
        │   ├── DCS-001-basel-satellite.psd ☁️ cloud  (generates 24×24 satellite print)
        │   └── DCS-001-basel-selected.dng  ☁️ cloud  (the one chosen capture photo)
        ├── painting/
        │   └── DCS-001-basel-painting.jpg  ☁️ cloud  (photo of physical painting — irreplaceable)
        ├── capture-photos/
        │   └── (31 remaining DNGs)         💾 dual drive only
        ├── audio/
        │   └── DCS-001-basel-rap.mp3       local copy, R2 is master
        ├── video/
        │   └── DCS-001-basel.mp4           local copy, R2 is master
        └── web/
            └── DCS-001-basel.jpg           local copy, R2 is master
```

**Cloud backup per artwork:** comp PSD + satellite PSD + selected DNG + painting photo.
These four files can regenerate the full triptych at any print size.
**Remaining capture DNGs:** dual drive only — large files, not needed for print regeneration.

---

### Megacities (MEG)

Programmatic satellite image composites — large layered PSDs (3–4GB). Most outputs can be regenerated from the master file if layers are correctly named.

```
megacities/
├── series/
│   ├── exhibition-assets/
│   ├── texts/
│   ├── videos/
│   ├── web-images/
│   ├── filters-archive/     (dead Instagram filters + AR assets — long-term storage)
│   └── programs/            (also backed up on GitHub)
│
└── artworks/
    └── MEG-001-germany/
        ├── MEG-001-germany.psd             ☁️ cloud  (3–4GB — source of truth)
        ├── comp/
        │   └── MEG-001-germany-comp.jpg    ☁️ cloud  (small comp — irreplaceable for WIP works)
        ├── satellites/
        │   ├── zoom/
        │   ├── mapbox/
        │   └── google/                     💾 dual drive only (re-scrappable)
        ├── ar/                             local copy, R2 is master
        ├── video/                          local copy, R2 is master
        └── web/
            └── MEG-001-germany.jpg         local copy, R2 is master
```

**Cloud backup per artwork:** master PSD + small comp.
**Small comp is critical** for works-in-progress where the full-size PSD hasn't been made yet.
**Satellite images:** dual drive only — can be re-scraped, and newer versions are often better.
**Programs:** back up on GitHub as code, not in file storage.
**All print sizes, AR assets, videos:** regenerate from master PSD using programs.

---

### Remaining Series — Standard Pattern

Oil Paintings (OIL), Watercolors (WAT), Drawings (DRW), Art Collision (COL), Vanishing Landscapes (VAN) all follow the same simple structure:

```
[series-name]/
├── series/
│   ├── exhibition-assets/
│   ├── texts/
│   └── templates/
│       └── print-template.psd              ☁️ cloud (if prints exist)
│
└── artworks/
    └── [CODE]-001-[title]/
        ├── [CODE]-001-[title].psd          ☁️ cloud
        └── web/
            └── [CODE]-001-[title].jpg      local copy, R2 is master
```

**Cloud backup per artwork:** PSD only.

---

### Videos (VID)

```
videos/
├── series/
│   ├── exhibition-assets/
│   └── texts/
│
└── artworks/
    └── VID-001-[title]/
        ├── VID-001-[title]-master.mp4      ☁️ cloud
        └── web/
            └── VID-001-[title].mp4         local copy, R2 is master
```

**Cloud backup per artwork:** master video file.

---

### Performances (PER)

```
performances/
├── series/
│   ├── exhibition-assets/
│   └── texts/
│
└── artworks/
    └── PER-001-[title]/
        ├── photos/                         ☁️ cloud
        ├── video/
        │   └── PER-001-[title].mp4         ☁️ cloud
        └── web/
            └── (web assets)                local copy, R2 is master
```

**Cloud backup per artwork:** all performance photos + video.
Performances are live events — no source file to regenerate from, so photos and video are all irreplaceable.

---

## Quick Reference — What Goes Where

| File type | Cloud | R2 | Dual drive |
|---|---|---|---|
| Master PSD / layered comp | ✓ | — | — |
| Final web image (JPG) | — | ✓ | local copy |
| AR video per artwork | — | ✓ | local copy |
| Series general videos | — | ✓ | local copy |
| Print template (per series) | ✓ | — | — |
| Print files (per artwork) | — | — | regenerate |
| DCS satellite PSD | ✓ | — | — |
| DCS selected capture DNG | ✓ | — | — |
| DCS remaining capture DNGs | — | — | ✓ |
| DCS painting photo | ✓ | — | — |
| MEG small comp | ✓ | — | — |
| MEG satellite images | — | — | ✓ |
| MEG programs | GitHub | — | — |
| ACH source photos | — | — | ✓ |
| Performance photos | ✓ | — | — |
| Performance video | ✓ | — | — |

---

## Migration Notes

When migrating existing folders to this structure:

1. Rename artwork folders to the new ID format (`ACH-001-cliff-house-1863`)
2. Rename the main PSD to match the folder name
3. Move source photos into `source/` subfolder
4. Move web images into `web/` subfolder
5. Move AR videos into `ar/` subfolder
6. Move series-level assets into `series/` subfolders
7. Delete or archive raw photo folders once the final web image exists
8. Once reorganised, run the cloud backup for all ☁️ files before anything else

---

*Bernard Bolter · Artwork Backup System · May 2026*

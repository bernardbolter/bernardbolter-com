/**
 * Canonical artwork media slots for Art/Official cataloguing.
 * Each slot maps to Payload fields on `artworks` (or ACH groups).
 */

export type MediaSlotKind = 'image' | 'video-file' | 'video-url' | 'video-array'

export type MediaSlotPhase =
  | 'primary'
  | 'ach'
  | 'dcs'
  | 'megacities'
  | 'secondary'
  | 'video'
  | 'documentation'

export type ArtworkMediaSlot = {
  id: string
  label: string
  description: string
  phase: MediaSlotPhase
  kind: MediaSlotKind
  /** Payload dotted path for a single upload or URL field */
  field?: string
  /** For array slots — append rows to this top-level array field */
  arrayField?: string
  /** Nested array on artworks (e.g. ach.sourcePhotographs) */
  nestedArrayPath?: string
  /** Upload field name inside each nested array row (default: image) */
  nestedArrayImageField?: string
  achOnly?: boolean
  dcsOnly?: boolean
  megacitiesOnly?: boolean
  /** Dialogue phase when the agent should typically offer this slot */
  suggestAfterPrimary?: boolean
}

export const ARTWORK_MEDIA_SLOTS: ArtworkMediaSlot[] = [
  {
    id: 'primary',
    label: 'Primary artwork image',
    description:
      'Clear photograph of the finished piece (or poster still for video works). Required to continue cataloguing.',
    phase: 'primary',
    kind: 'image',
    field: 'primaryImage',
  },
  {
    id: 'poster',
    label: 'Poster / thumbnail still',
    description:
      'Social, timeline, or video poster image. Use when the work is video-based or you want a separate still from the main photograph.',
    phase: 'video',
    kind: 'image',
    field: 'posterImage',
    suggestAfterPrimary: true,
  },
  {
    id: 'ach-source',
    label: 'ACH source photographs',
    description:
      'Historical photographs transferred onto the canvas (A Colorful History). Add one or more — not the finished painting.',
    phase: 'ach',
    kind: 'image',
    nestedArrayPath: 'ach.sourcePhotographs',
    nestedArrayImageField: 'sourceImage',
    achOnly: true,
    suggestAfterPrimary: true,
  },
  {
    id: 'ach-transfer',
    label: 'ACH transfer / reveal image',
    description:
      'Canvas after photo transfer, before painted fields — same crop as the primary image if possible.',
    phase: 'ach',
    kind: 'image',
    field: 'ach.revealSlider.transferImage',
    achOnly: true,
    suggestAfterPrimary: true,
  },
  // ── DCS slots ───────────────────────────────────────────────────
  {
    id: 'dcs-street',
    label: 'DCS street photo (Micro)',
    description:
      'The decisive-moment street photograph selected from the capture set. One per city — the Micro layer in the Smoothist composition.',
    phase: 'dcs',
    kind: 'image',
    field: 'dcs.composition.streetPhotoImage',
    dcsOnly: true,
    suggestAfterPrimary: true,
  },
  {
    id: 'dcs-satellite',
    label: 'DCS satellite / aerial image (Macro)',
    description:
      'Satellite or aerial view of the city providing geographic context. The Macro layer in the Smoothist composition.',
    phase: 'dcs',
    kind: 'image',
    field: 'dcs.composition.satelliteViewImage',
    dcsOnly: true,
    suggestAfterPrimary: true,
  },
  {
    id: 'dcs-flag',
    label: 'DCS city / country flag',
    description:
      'Transparent PNG of the city or country flag. Used as a decorative layer on the artwork page.',
    phase: 'dcs',
    kind: 'image',
    field: 'dcs.cityContext.cityFlagImage',
    dcsOnly: true,
    suggestAfterPrimary: true,
  },
  {
    id: 'dcs-oil-painting',
    label: 'DCS oil painting (Da Fen collaboration)',
    description:
      'Photograph of the finished Da Fen oil painting collaboration. Only relevant when dcs.oilPainting.hasOilPainting is true.',
    phase: 'dcs',
    kind: 'image',
    field: 'dcs.oilPainting.oilPaintingImage',
    dcsOnly: true,
    suggestAfterPrimary: true,
  },
  // ── Megacities slots ──────────────────────────────────────────────
  {
    id: 'megacities-reference',
    label: 'Megacities small-scale reference',
    description:
      'Small-scale working composition or layout reference — the resolved collage before full-size execution.',
    phase: 'megacities',
    kind: 'image',
    field: 'megacities.composition.referenceCollageImage',
    megacitiesOnly: true,
    suggestAfterPrimary: true,
  },
  {
    id: 'megacities-flag',
    label: 'Megacities country / region flag',
    description:
      'Transparent PNG of the country or regional flag when used as a layer on megacities.world.',
    phase: 'megacities',
    kind: 'image',
    field: 'megacities.composition.countryFlagImage',
    megacitiesOnly: true,
    suggestAfterPrimary: true,
  },
  {
    id: 'work-view',
    label: 'Other views of the work',
    description:
      'Additional photographs that are part of the work itself — other angles (e.g. front/side/back of a sculpture), verso, raking light, scale. Add as many as needed so the whole piece is visible. Maps to alternateViewImages.',
    phase: 'secondary',
    kind: 'image',
    arrayField: 'alternateViewImages',
    suggestAfterPrimary: true,
  },
  {
    id: 'detail',
    label: 'Detail / close-up',
    description:
      'Cropped views — texture, passage, signature, material. Maps to detailImages. You can add more than one.',
    phase: 'secondary',
    kind: 'image',
    arrayField: 'detailImages',
    suggestAfterPrimary: true,
  },
  {
    id: 'documentation-photo',
    label: 'Documentation photo',
    description:
      'Studio, process, materials, or publication documentation — not another angle of the finished piece. Maps to documentationImages. You can add more than one.',
    phase: 'documentation',
    kind: 'image',
    arrayField: 'documentationImages',
    suggestAfterPrimary: true,
  },
  {
    id: 'installation',
    label: 'Installation shot',
    description:
      'Work installed in a gallery or site (venue/date in admin later). Maps to installationShots.',
    phase: 'secondary',
    kind: 'image',
    arrayField: 'installationShots',
    suggestAfterPrimary: true,
  },
  {
    id: 'video-primary-file',
    label: 'Primary video file',
    description: 'Upload MP4, MOV, or WebM to R2. Takes precedence over an embed URL.',
    phase: 'video',
    kind: 'video-file',
    field: 'videoFile',
    suggestAfterPrimary: true,
  },
  {
    id: 'video-primary-url',
    label: 'Primary video (YouTube / Vimeo / URL)',
    description: 'Paste an embeddable link when the primary work is hosted externally.',
    phase: 'video',
    kind: 'video-url',
    field: 'videoUrl',
    suggestAfterPrimary: true,
  },
  {
    id: 'video-doc-file',
    label: 'Documentation video file',
    description: 'Process film or walkthrough uploaded to R2.',
    phase: 'documentation',
    kind: 'video-file',
    field: 'documentationVideoFile',
    suggestAfterPrimary: true,
  },
  {
    id: 'video-doc-url',
    label: 'Documentation video URL',
    description: 'YouTube, Vimeo, or other URL for documentation of a physical work.',
    phase: 'documentation',
    kind: 'video-url',
    field: 'documentationVideoUrl',
    suggestAfterPrimary: true,
  },
  {
    id: 'video-extra',
    label: 'Additional video clip',
    description:
      'Making-of, interview, or extra clip (YouTube, Vimeo, URL, or file upload). You can add more than one.',
    phase: 'video',
    kind: 'video-array',
    arrayField: 'videos',
    suggestAfterPrimary: true,
  },
]

export function getMediaSlot(id: string): ArtworkMediaSlot | undefined {
  return ARTWORK_MEDIA_SLOTS.find((s) => s.id === id)
}

export function detectVideoEmbedType(
  url: string,
): 'youtube' | 'vimeo' | 'url' | null {
  const u = url.trim()
  if (!u) return null
  try {
    const host = new URL(u).hostname.replace(/^www\./, '')
    if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com') {
      return 'youtube'
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      return 'vimeo'
    }
    return 'url'
  } catch {
    return null
  }
}

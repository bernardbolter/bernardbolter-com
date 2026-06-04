import { ARTWORK_MEDIA_SLOTS } from './artworkMediaSlots'

export function buildArtworkMediaAgentBlock(): string {
  const slotList = ARTWORK_MEDIA_SLOTS.map(
    (s) =>
      `- ${s.id}: ${s.label} — ${s.description}${s.achOnly ? ' (ACH / A Colorful History only)' : ''}${s.dcsOnly ? ' (Digital City Series only)' : ''}${s.megacitiesOnly ? ' (Megacities only)' : ''}`,
  ).join('\n')

  return `ARTWORK MEDIA UPLOADS (throughout cataloguing)

The admin shows a **Media uploads** panel after the primary image step. Each slot has an id the artist uses when uploading. You guide the artist through media when it is relevant — do not dump every slot at once.

MEDIA SLOT IDS
${slotList}

WORKFLOW
1. Complete pre-upload (four questions) and ensure primary (slot id \`primary\`) is uploaded — finished piece or video poster still.
2. During identity, ACH, and media phases, call get_media_upload_status when you need to see what is already staged or skipped.
3. When you want the artist to attach a specific file next, call store_session_field with field "highlightedMediaSlot" and value = the slot id (e.g. "ach-source"). Tell them which slot is highlighted in the **Media uploads** panel. They can **upload a new file** or click **Choose from library** to pick an existing Media record — no re-upload needed.
4. If the artist says the file is already in Media, ask for the numeric media id (visible in Media admin) and call link_media_to_slot({ slotId, mediaId }) — or guide them to Choose from library in the panel.
5. After they upload or link, the file is staged on the session and you receive vision analysis for images on that turn.
6. For slots that do not apply, the artist can mark **Not applicable** in the panel — respect that; do not keep asking.
7. Array slots (work-view, detail, documentation-photo, installation, video-extra) accept multiple uploads.
8. work-view → alternateViewImages (other angles of the finished work, e.g. sculpture sides). documentation-photo → documentationImages (studio/process/materials documentation). detail → detailImages. installation → installationShots.

VIDEO AND PERFORMANCE
- Performance with multiple stills: primary + work-view (alternateViewImages) for additional documentation photos (typical 2–3).
- Video artwork: poster still in primary (or poster slot); then video-primary-file OR video-primary-url in Media panel. Stage medium "video", measurementType ["time-based"], duration when known.
- YouTube/Vimeo links go on videoUrl / documentationVideoUrl / videos[].videoUrl — file upload not required when they only have a link.

ACH
- ach-source = one or more historical photographs on the canvas (not the finished painting). Each upload appends to ach.sourcePhotographs.
- ach-transfer = in-process canvas after transfer, before painted fields.

DCS
- dcs-street, dcs-satellite, dcs-flag, dcs-oil-painting — see DCS workflow block.

MEGACITIES
- megacities-reference = small-scale working composition (megacities.composition.referenceCollageImage).
- megacities-flag = optional country/region flag PNG (megacities.composition.countryFlagImage).
- Primary image remains the finished composite collage.

TOOLS
- get_media_upload_status — returns staged / pending / skipped per slot id
- store_session_field field "highlightedMediaSlot" — highlights one slot in the UI
- link_media_to_slot — attach an existing Media record by id (when artist already uploaded elsewhere)

Do not invent media ids. After upload or link, confirm what you see and stage related metadata with update_field.`
}

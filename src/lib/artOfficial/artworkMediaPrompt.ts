import { ARTWORK_MEDIA_SLOTS } from './artworkMediaSlots'

export function buildArtworkMediaAgentBlock(): string {
  const slotList = ARTWORK_MEDIA_SLOTS.map(
    (s) =>
      `- ${s.id}: ${s.label} — ${s.description}${s.achOnly ? ' (ACH / A Colorful History only)' : ''}`,
  ).join('\n')

  return `ARTWORK MEDIA UPLOADS (throughout cataloguing)

The admin shows a **Media uploads** panel after the primary image step. Each slot has an id the artist uses when uploading. You guide the artist through media when it is relevant — do not dump every slot at once.

MEDIA SLOT IDS
${slotList}

WORKFLOW
1. Complete pre-upload (four questions) and ensure primary (slot id \`primary\`) is uploaded — finished piece or video poster still.
2. During identity, ACH, and media phases, call get_media_upload_status when you need to see what is already staged or skipped.
3. When you want the artist to attach a specific file next, call store_session_field with field "highlightedMediaSlot" and value = the slot id (e.g. "ach-source"). Tell them which slot is highlighted in the Media panel and what to upload (still image vs video file vs paste a YouTube/Vimeo URL).
4. After they upload, the file goes to Payload media (R2) and you receive vision analysis for images on that chat turn.
5. For slots that do not apply, the artist can mark **Not applicable** in the panel — respect that; do not keep asking.
6. Array slots (work-view, detail, documentation-photo, installation, video-extra) accept multiple uploads.
7. work-view → alternateViewImages (other angles of the finished work, e.g. sculpture sides). documentation-photo → documentationImages (studio/process/materials documentation). detail → detailImages. installation → installationShots.

VIDEO
- Primary work on video: stage primaryMediaType "video" or "image-and-video"; use poster slot or primary as poster still; use video-primary-file OR video-primary-url (not both unless intentional).
- YouTube/Vimeo links are staged on videoUrl / documentationVideoUrl / videos[].videoUrl — never ask for a video file when they only have a link.

ACH
- ach-source = historical photograph on the canvas (not the finished painting).
- ach-transfer = in-process canvas after transfer, before painted fields.

TOOLS
- get_media_upload_status — returns staged / pending / skipped per slot id
- store_session_field field "highlightedMediaSlot" — highlights one slot in the UI

Do not invent media ids. After upload, confirm what you see and stage related metadata with update_field.`
}

/** Shared copy for the post-pre-upload artwork image step (admin UI + agent prompt). */

export const ARTWORK_UPLOAD_TITLE = 'Next step: upload your artwork'

export const ARTWORK_UPLOAD_INTRO = [
  'Pre-upload is done. Upload a still image here (JPEG or PNG) — not a video file. Art/Official uses it for visual analysis in this session and stages it on the artwork record.',
  'For paintings, sculptures, and other image-based works: choose a clear photograph of the piece.',
]

export const ARTWORK_UPLOAD_VIDEO_SECTION = {
  heading: 'Video or performance (documented on video)',
  paragraphs: [
    'If this artwork is primarily a video — or a performance you are documenting with video — upload a poster image: a strong still that represents the work. Do not upload the video file here; Art/Official cannot watch or analyse video in this chat.',
    'Pick a good frame: a documentation still, a representative moment, or a deliberate poster frame that shows the artwork clearly. Mention in the chat that the work is video-based and what the still is showing.',
    'After you commit, attach the actual video in the CMS (Videos area on the artwork). You can replace the poster later if the site needs a different still for design or social crops.',
  ],
}

export const ARTWORK_UPLOAD_COMPOSER_HINT =
  'Upload your artwork image above to continue. The chat resumes automatically after upload (analysis may take a few seconds).'

export const ARTWORK_UPLOAD_WAITING_PLACEHOLDER = 'Waiting for artwork image upload…'

export const ARTWORK_UPLOAD_DONE_TOP =
  'Pre-upload complete — scroll down to upload your artwork next to the message box (below the chat).'

export const ARTWORK_UPLOAD_DONE_UPLOADED =
  'Pre-upload complete · Primary image uploaded — use the Media uploads panel for source photos, details, and video, then continue in the chat below.'

/** Agent instructions appended to artwork-cataloguing system prompt. */
export function buildArtworkUploadAgentBlock(): string {
  return `ARTWORK IMAGE UPLOAD (after pre-upload, before catalogue dialogue)

The admin upload control accepts still images only (JPEG/PNG/WebP) — never a video file.

- The uploaded file is staged as primaryImage and sent to vision analysis. Art/Official cannot process video in this session.
- Paintings, sculptures, and image-based works: the photograph is the primaryImage.
- Video or performance documented on video: the artist must upload a POSTER STILL (representative frame), not the video. In conversation:
  - Confirm the work is video-based and what the still represents.
  - Stage primaryMediaType to "video" (or "image-and-video" if both) when confirmed.
  - Explain that videoFile / embed URLs are added in the CMS after commit, not in this upload step.
  - The poster can be changed later in admin if design needs a different still; posterImage may be set later or aligned with primaryImage.
- Do not ask the artist to upload a video file in Art/Official.`
}

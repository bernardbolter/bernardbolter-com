'use client'

import {
  ARTWORK_UPLOAD_INTRO,
  ARTWORK_UPLOAD_TITLE,
  ARTWORK_UPLOAD_VIDEO_SECTION,
} from '@/lib/artOfficial/artworkUploadCopy'

import { ImageUpload } from './ImageUpload'

export function ComposerUploadBar({
  onUploaded,
  disabled,
}: {
  onUploaded: (mediaId: number) => void
  disabled?: boolean
}) {
  return (
    <div className="art-official-chat__upload-bar" id="art-official-upload">
      <p className="art-official-chat__upload-bar-title">{ARTWORK_UPLOAD_TITLE}</p>
      {ARTWORK_UPLOAD_INTRO.map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="art-official-chat__upload-bar-lead">
          {paragraph}
        </p>
      ))}
      <div className="art-official-chat__upload-bar-video">
        <p className="art-official-chat__upload-bar-video-heading">
          {ARTWORK_UPLOAD_VIDEO_SECTION.heading}
        </p>
        {ARTWORK_UPLOAD_VIDEO_SECTION.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="art-official-chat__upload-bar-video-text">
            {paragraph}
          </p>
        ))}
      </div>
      <ImageUpload onUploaded={onUploaded} disabled={disabled} />
    </div>
  )
}

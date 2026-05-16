'use client'

import { ImageUpload } from './ImageUpload'

export function PreUploadPanel({
  hasFirstImpression,
  onImageUploaded,
}: {
  hasFirstImpression: boolean
  onImageUploaded: (mediaId: number) => void
}) {
  if (!hasFirstImpression) {
    return (
      <p style={{ fontSize: 13, opacity: 0.7, margin: '12px 0' }}>
        Complete the pre-upload dialogue (blind description) before uploading the image.
      </p>
    )
  }

  return <ImageUpload onUploaded={onImageUploaded} />
}

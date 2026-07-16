import { Suspense } from 'react'

import { StudioInputPage } from '@/components/studio/StudioInputPage'

export default function StudioUploadPage() {
  return (
    <Suspense
      fallback={
        <section className="studio-upload-page">
          <h2>Upload</h2>
          <p className="studio-upload-page__lede">Loading…</p>
        </section>
      }
    >
      <StudioInputPage />
    </Suspense>
  )
}

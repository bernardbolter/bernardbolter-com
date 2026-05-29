import { UploadForm } from '@/components/studio/UploadForm'

export default function StudioUploadPage() {
  return (
    <section className="studio-upload-page">
      <h2>Upload</h2>
      <p className="studio-upload-page__lede">
        Fast capture for photos, clips, voice memos, and text notes. Processing runs in the
        background.
      </p>
      <UploadForm />
    </section>
  )
}

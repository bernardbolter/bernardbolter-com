import Link from 'next/link'

import { AnimationMakerClient } from '@/components/studio/AnimationMakerClient'
import { getStudioPayload } from '@/lib/studio/getStudioPayload'
import { listStudioArtworks } from '@/lib/studio/artworks'

export default async function AnimationMakerPage() {
  const { payload, user } = await getStudioPayload()
  const { docs } = await listStudioArtworks(payload, user, 100)

  return (
    <section>
      <header className="studio-page-header">
        <div>
          <h2>Painting Animation Maker</h2>
          <p className="studio-muted">
            Regenerate timelapses here. The Paintings dossier is display-only.
          </p>
        </div>
        <Link href="/studio/paintings" className="studio-page-header__link">
          Browse paintings →
        </Link>
      </header>
      <AnimationMakerClient
        paintings={docs.map((doc) => ({
          id: doc.id,
          title: doc.title,
          hasTimelapse: Boolean(doc.finalReferenceImage),
        }))}
      />
    </section>
  )
}

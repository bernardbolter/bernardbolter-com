import Link from 'next/link'

import { PaintingCard } from '@/components/studio/PaintingCard'
import { getStudioPayload } from '@/lib/studio/getStudioPayload'
import { listStudioArtworks } from '@/lib/studio/artworks'

export default async function StudioPaintingsPage() {
  const { payload, user } = await getStudioPayload()
  const { docs } = await listStudioArtworks(payload, user)

  return (
    <section>
      <header className="studio-page-header">
        <div>
          <h2>Paintings</h2>
          <p className="studio-muted">
            Read-only dossiers. Regenerate timelapses in Tools → Animation Maker.
          </p>
        </div>
        <Link href="/studio/paintings/new" className="studio-page-header__action">
          New painting
        </Link>
      </header>
      {docs.length === 0 ? (
        <p className="studio-muted">No paintings yet. Create one to start a process timeline.</p>
      ) : (
        <ul className="studio-card-grid">
          {docs.map((artwork) => (
            <li key={artwork.id}>
              <PaintingCard artwork={artwork} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

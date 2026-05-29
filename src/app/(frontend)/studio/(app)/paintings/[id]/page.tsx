import { notFound } from 'next/navigation'

import { PaintingDetail } from '@/components/studio/PaintingDetail'
import {
  getStudioArtwork,
  listArtworkProcessNotes,
} from '@/lib/studio/artworks'
import { getStudioPayload } from '@/lib/studio/getStudioPayload'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PaintingDetailPage({ params }: PageProps) {
  const { id } = await params
  const artworkId = Number(id)
  if (!Number.isFinite(artworkId)) notFound()

  const { payload, user } = await getStudioPayload()
  let artwork
  try {
    artwork = await getStudioArtwork(payload, user, artworkId)
  } catch {
    notFound()
  }

  const processNotes = await listArtworkProcessNotes(payload, user, artworkId)

  return (
    <section>
      <PaintingDetail artwork={artwork} processNotes={processNotes} />
    </section>
  )
}

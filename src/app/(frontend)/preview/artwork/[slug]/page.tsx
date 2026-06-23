import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import ArtworkPage from '@/components/artwork/ArtworkPage'
import { resolveArtworkMenuPlusColor } from '@/lib/artwork/artworkMenuPlusColor'
import { getArtworkForPreview } from '@/lib/payload/artworkPage'
import { ArtworkPageChromeProvider } from '@/providers/ArtworkPageChromeContext'
import { getArtistRecord } from '@/lib/payload/siteDocuments'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Artwork preview (dev)',
}

export default async function PreviewArtworkPage({ params }: Props) {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  const { slug } = await params
  const [artwork, artist] = await Promise.all([
    getArtworkForPreview(slug),
    getArtistRecord(),
  ])

  if (!artwork) notFound()

  return (
    <ArtworkPageChromeProvider menuPlusColor={resolveArtworkMenuPlusColor(artwork)}>
      <div className="artwork-page__layout">
        <ArtworkPage artwork={artwork} artist={artist} />
      </div>
    </ArtworkPageChromeProvider>
  )
}

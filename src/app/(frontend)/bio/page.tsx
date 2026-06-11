import type { Metadata } from 'next'

import Bio from '@/components/bio/Bio'
import Info from '@/components/info/Info'
import { normalizeBioPhotos } from '@/helpers/bioPhotos'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { getBioPageArtist } from '@/lib/payload/bioPage'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Bio',
  description: 'Biography of Bernard Bolter.',
  alternates: { canonical: '/bio' },
}

export default async function BioPage() {
  const artist = await getBioPageArtist()
  const bioText = lexicalToPlain(artist?.bioMedium)
  const paragraphs = bioText
    .split('\n\n')
    .map((entry) => entry.trim())
    .filter(Boolean)

  return (
    <div className="bio-page__container">
      <Info />
      <Bio
        tagline={artist?.bioShort}
        paragraphs={paragraphs}
        images={normalizeBioPhotos(artist?.bioPhotos)}
      />
    </div>
  )
}

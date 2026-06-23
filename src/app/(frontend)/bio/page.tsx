import type { Metadata } from 'next'

import Bio from '@/components/bio/Bio'
import { normalizeBioPhotos } from '@/helpers/bioPhotos'
import { formatBioBirthLine, formatBioLivesAndWorksLine } from '@/lib/bio/bioHeader'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getBioPageArtist } from '@/lib/payload/bioPage'
import { getPublishedSeriesMentions } from '@/lib/payload/series'
import { generateBioJsonLd } from '@/utilities/generateBioJsonLd'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Bio',
  description: 'Biography of Bernard Bolter.',
  alternates: { canonical: '/bio' },
}

export default async function BioPage() {
  const [artist, seriesMentions] = await Promise.all([
    getBioPageArtist(),
    getPublishedSeriesMentions(),
  ])
  const jsonLd = artist ? generateBioJsonLd(artist, { baseUrl: getSiteBaseUrl() }) : null

  return (
    <div className="bio-page__container">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {artist ? (
        <Bio
          name={artist.name}
          birthLine={formatBioBirthLine(artist)}
          livesAndWorksLine={formatBioLivesAndWorksLine(artist)}
          tagline={artist.bioShort}
          bioFull={artist.bioFull}
          seriesMentions={seriesMentions}
          images={normalizeBioPhotos(artist.bioPhotos)}
        />
      ) : (
        <Bio name={null} birthLine={null} livesAndWorksLine={null} tagline={null} bioFull={null} images={[]} />
      )}
    </div>
  )
}

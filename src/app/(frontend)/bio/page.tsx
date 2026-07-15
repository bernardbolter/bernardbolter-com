import type { Metadata } from 'next'

import Bio from '@/components/bio/Bio'
import { normalizeBioPhotos } from '@/helpers/bioPhotos'
import {
  historicalBioLinks,
  publicBioTimelineEntries,
} from '@/lib/artist/accumulatingEntries'
import { attachPublicSessionRefs } from '@/lib/artist/attachPublicSessionRefs'
import { formatBioBirthLine, formatBioLivesAndWorksLine } from '@/lib/bio/bioHeader'
import { getBioPageArtist } from '@/lib/payload/bioPage'
import { getPublishedSeriesMentions } from '@/lib/payload/series'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Bio',
  description: 'Biography of Bernard Bolter.',
  alternates: { canonical: '/bio' },
}

export default async function BioPage() {
  const [rawArtist, seriesMentions] = await Promise.all([
    getBioPageArtist(),
    getPublishedSeriesMentions(),
  ])
  const artist = rawArtist ? await attachPublicSessionRefs(rawArtist) : null

  return (
    <div className="bio-page__container">
      {artist ? (
        <Bio
          name={artist.name}
          birthLine={formatBioBirthLine(artist)}
          livesAndWorksLine={formatBioLivesAndWorksLine(artist)}
          tagline={artist.bioShort}
          bioFull={artist.bioFull}
          seriesMentions={seriesMentions}
          images={normalizeBioPhotos(artist.bioPhotos)}
          timelineEntries={publicBioTimelineEntries(artist)}
          historicalBios={historicalBioLinks(artist)}
        />
      ) : (
        <Bio
          name={null}
          birthLine={null}
          livesAndWorksLine={null}
          tagline={null}
          bioFull={null}
          images={[]}
        />
      )}
    </div>
  )
}

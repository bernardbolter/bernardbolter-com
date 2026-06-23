import type { Metadata } from 'next'

import CV from '@/components/cv/CV'
import { buildCvSections } from '@/lib/cv/buildCvSections'
import { formatBioBirthLine, formatBioLivesAndWorksLine } from '@/lib/bio/bioHeader'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getCvEvents } from '@/lib/payload/cvEvents'
import { getCvPageArtist } from '@/lib/payload/cvPage'
import { buildCvJsonLd } from '@/utilities/buildCvJsonLd'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Curriculum vitae',
  description: 'Education, exhibitions, publications, awards, and professional activities.',
  alternates: { canonical: '/cv' },
}

export default async function CvPage() {
  const [events, artist] = await Promise.all([getCvEvents(), getCvPageArtist()])
  const sections = buildCvSections(events, artist)
  const jsonLd = buildCvJsonLd(events, artist, { baseUrl: getSiteBaseUrl() })

  return (
    <div className="cv-page__container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CV
        sections={sections}
        printName={artist?.name ?? null}
        printBirthLine={artist ? formatBioBirthLine(artist) : null}
        printLivesLine={artist ? formatBioLivesAndWorksLine(artist) : null}
      />
    </div>
  )
}

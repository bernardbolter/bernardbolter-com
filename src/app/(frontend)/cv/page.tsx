import type { Metadata } from 'next'

import CV from '@/components/cv/CV'
import Info from '@/components/info/Info'
import { buildCvSections } from '@/lib/cv/buildCvSections'
import { getCvEvents } from '@/lib/payload/cvEvents'
import { getCvPageArtist } from '@/lib/payload/cvPage'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Curriculum vitae',
  description: 'Education, exhibitions, publications, awards, and professional activities.',
  alternates: { canonical: '/cv' },
}

export default async function CvPage() {
  const [events, artist] = await Promise.all([getCvEvents(), getCvPageArtist()])
  const sections = buildCvSections(events, artist)

  return (
    <div className="cv-page__container">
      <Info />
      <CV sections={sections} />
    </div>
  )
}

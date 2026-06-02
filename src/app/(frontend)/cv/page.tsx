import type { Metadata } from 'next'

import CvPageContent from '@/components/cv/CvPageContent'
import { buildCvSections } from '@/lib/cv/buildCvSections'
import { getCvEvents } from '@/lib/payload/cvEvents'
import { getArtistRecord } from '@/lib/payload/siteDocuments'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Curriculum vitae',
  description: 'Education, exhibitions, publications, awards, and professional activities.',
  alternates: { canonical: '/cv' },
}

export default async function CvPage() {
  const [events, artist] = await Promise.all([getCvEvents(), getArtistRecord()])
  const sections = buildCvSections(events, artist)

  return <CvPageContent sections={sections} />
}

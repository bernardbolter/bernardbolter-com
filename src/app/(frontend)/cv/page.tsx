import type { Metadata } from 'next'

import CV from '@/components/cv/CV'
import Info from '@/components/info/Info'
import { buildCvSections } from '@/lib/cv/buildCvSections'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { getCvEvents } from '@/lib/payload/cvEvents'
import { getCvPageArtist } from '@/lib/payload/cvPage'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Curriculum vitae',
  description: 'Education, exhibitions, publications, awards, and professional activities.',
  alternates: { canonical: '/cv' },
}

function readFooterImage(artist: Awaited<ReturnType<typeof getCvPageArtist>>) {
  const media = artist?.cvFooterImage
  if (!media || typeof media !== 'object' || !media.url) {
    return { imageUrl: null, imageAlt: '' }
  }
  return {
    imageUrl: media.url,
    imageAlt: media.alt || 'CV footer image',
  }
}

export default async function CvPage() {
  const [events, artist] = await Promise.all([getCvEvents(), getCvPageArtist()])
  const sections = buildCvSections(events, artist)
  const statementText = lexicalToPlain(artist?.statementFull)
  const statementParagraphs = statementText
    .split('\n\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
  const { imageUrl, imageAlt } = readFooterImage(artist)

  return (
    <div className="cv-page__container">
      <Info />
      <CV
        sections={sections}
        footer={{
          imageUrl,
          imageAlt,
          statementParagraphs,
        }}
      />
    </div>
  )
}

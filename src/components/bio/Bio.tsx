import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import type { BioPageImage } from '@/helpers/bioPhotos'
import type { SeriesMention } from '@/lib/bio/linkSeriesMentions'

import BioHeader from './BioHeader'
import BioPhotoGrid from './BioPhotoGrid'
import BioProse from './BioProse'

interface BioProps {
  name?: string | null
  birthLine?: string | null
  livesAndWorksLine?: string | null
  tagline?: string | null
  bioFull: unknown
  seriesMentions?: SeriesMention[]
  images: BioPageImage[]
}

export default function Bio({
  name,
  birthLine,
  livesAndWorksLine,
  tagline,
  bioFull,
  seriesMentions = [],
  images,
}: BioProps) {
  return (
    <DocumentScrollShell
      title="BIO"
      closeHref="/"
      scrollClassName="bio-container"
      closeClassName="bio__close-container"
    >
      <div className="bio__content-container">
        <BioHeader name={name} birthLine={birthLine} livesAndWorksLine={livesAndWorksLine} />
        {tagline ? <p className="bio__tagline">{tagline}</p> : null}
        <BioProse content={bioFull} seriesMentions={seriesMentions} />
      </div>
      <BioPhotoGrid images={images} />
    </DocumentScrollShell>
  )
}

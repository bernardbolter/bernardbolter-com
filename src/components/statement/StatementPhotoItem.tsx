import Image from 'next/image'

import type { StatementPhoto } from '@/helpers/statementPhotos'

import { PhotoCaption } from './PhotoCaption'

interface StatementPhotoItemProps {
  photo: StatementPhoto
  spanFullWidth?: boolean
}

export default function StatementPhotoItem({ photo, spanFullWidth = false }: StatementPhotoItemProps) {
  return (
    <figure className={`statement-photo${spanFullWidth ? ' statement-photo--span-full' : ''}`}>
      <Image
        src={photo.url}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        className="statement-photo__img"
        sizes="(max-width: 767px) 90vw, 45vw"
      />
      {photo.caption ? <PhotoCaption caption={photo.caption} imageType={photo.imageType} /> : null}
    </figure>
  )
}

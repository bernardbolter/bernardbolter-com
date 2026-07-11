import type { StatementPhoto } from '@/helpers/statementPhotos'

import { PhotoCaption } from './PhotoCaption'

interface StatementPhotoItemProps {
  photo: StatementPhoto
  spanFullWidth?: boolean
}

export default function StatementPhotoItem({ photo, spanFullWidth = false }: StatementPhotoItemProps) {
  return (
    <figure className={`statement-photo${spanFullWidth ? ' statement-photo--span-full' : ''}`}>
      <img
        src={photo.url}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        className="statement-photo__img"
        loading="lazy"
        decoding="async"
      />
      {photo.caption ? <PhotoCaption caption={photo.caption} imageType={photo.imageType} /> : null}
    </figure>
  )
}

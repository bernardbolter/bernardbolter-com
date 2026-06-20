import type { StatementPhoto } from '@/helpers/statementPhotos'

import StatementPhotoItem from './StatementPhotoItem'

interface StatementSceneImagesProps {
  photos: StatementPhoto[]
}

export default function StatementSceneImages({ photos }: StatementSceneImagesProps) {
  if (photos.length === 0) return null

  const oddCount = photos.length % 2 !== 0

  return (
    <div className="statement-photo-grid">
      {photos.map((photo, index) => (
        <StatementPhotoItem
          key={photo.id}
          photo={photo}
          spanFullWidth={oddCount && index === photos.length - 1}
        />
      ))}
    </div>
  )
}

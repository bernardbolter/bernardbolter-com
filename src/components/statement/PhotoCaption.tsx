import type { StatementImageType } from '@/helpers/statementPhotos'

export function PhotoCaption({
  caption,
  imageType,
}: {
  caption: string
  imageType: StatementImageType
}) {
  return (
    <figcaption className="statement-caption">
      <span
        className={imageType === 'photograph' ? 'dot dot-solid' : 'dot dot-hollow'}
        aria-hidden
      />
      {caption}
    </figcaption>
  )
}

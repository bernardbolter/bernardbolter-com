import type { StatementFooterImage } from '@/lib/payload/statementFooterImages'

type Props = {
  images: StatementFooterImage[]
  variant?: 'statement' | 'default'
}

export default function StatementFooterImages({ images, variant = 'default' }: Props) {
  if (images.length === 0) return null

  const rootClass =
    variant === 'statement' ?
      'statement-footer-images statement-footer-images--statement'
    : 'statement-footer-images'

  return (
    <div className={rootClass}>
      {images.map((image, index) => (
        <figure key={`${image.url}-${index}`} className="statement-footer-images__figure">
          <img
            src={image.url}
            alt={image.alt}
            width={1600}
            height={900}
            className="statement-footer-images__img"
            loading="lazy"
            decoding="async"
          />
          <figcaption className="statement-footer-images__caption">{image.alt}</figcaption>
        </figure>
      ))}
    </div>
  )
}

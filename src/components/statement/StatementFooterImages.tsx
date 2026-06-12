import Image from 'next/image'

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

  const imageSizes =
    variant === 'statement' ?
      '(max-width: 767px) 90vw, 80vw'
    : '(max-width: 768px) 90vw, 800px'

  return (
    <div className={rootClass}>
      {images.map((image, index) => (
        <figure key={`${image.url}-${index}`} className="statement-footer-images__figure">
          <Image
            src={image.url}
            alt={image.alt}
            width={1600}
            height={900}
            className="statement-footer-images__img"
            sizes={imageSizes}
          />
          <figcaption className="statement-footer-images__caption">{image.alt}</figcaption>
        </figure>
      ))}
    </div>
  )
}

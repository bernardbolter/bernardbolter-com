import Link from 'next/link'

import { CloseCircleSvg } from '@/components/icons'
import HeaderTitle from '@/components/info/HeaderTitle'

interface StatementProps {
  paragraphs: string[]
}

export default function Statement({ paragraphs }: StatementProps) {
  return (
    <div className="bio-container">
      <HeaderTitle title="STATE" large />

      <Link href="/" className="bio__close-container">
        <CloseCircleSvg />
        <p>close</p>
      </Link>

      <div className="bio__content-container">
        {paragraphs.length > 0 ? (
          <div className="bio__main-content">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <div className="bio__main-content">
            <p>Statement content coming soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}

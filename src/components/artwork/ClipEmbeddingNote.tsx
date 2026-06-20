import Image from 'next/image'
import Link from 'next/link'

export type SimilarWorkItem = {
  slug: string
  title: string
  imageUrl: string
}

type Props = {
  artworkSlug: string
  hasClipEmbedding: boolean
  similarWorks: SimilarWorkItem[]
}

const CLIP_INFO_URL = 'https://huggingface.co/openai/clip-vit-large-patch14'

export default function ClipEmbeddingNote({
  artworkSlug,
  hasClipEmbedding,
  similarWorks = [],
}: Props) {
  const thumbnails = (similarWorks ?? []).slice(0, 3)

  return (
    <div className="clip-embedding-note">
      {thumbnails.length > 0 ? (
        <div className="clip-embedding-note__similar">
          <div className="clip-embedding-note__similar-header">
            <h3 className="clip-embedding-note__similar-title">Similar works</h3>
            <span className="clip-embedding-note__similar-via">via visual similarity</span>
          </div>
          <div className="clip-embedding-note__similar-grid">
            {thumbnails.map((work) => (
              <Link
                key={work.slug}
                href={`/${work.slug}`}
                className="clip-embedding-note__similar-link"
              >
                <div className="clip-embedding-note__similar-image">
                  <Image
                    src={work.imageUrl}
                    alt={work.title}
                    fill
                    sizes="(min-width: 768px) 160px, 33vw"
                    className="object-cover"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {hasClipEmbedding ? (
        <div className="clip-embedding-note__explainer">
          <p className="clip-embedding-note__explainer-text">
            This work has a machine-readable visual fingerprint — a CLIP embedding — that AI systems
            use to find visually and conceptually related work across the archive.
          </p>
          <p className="clip-embedding-note__links">
            <a href={CLIP_INFO_URL} target="_blank" rel="noopener noreferrer">
              What is a CLIP embedding? ↗
            </a>
            <Link href={`/${artworkSlug}/embedding`}>View this work&apos;s embedding →</Link>
          </p>
        </div>
      ) : (
        <p className="clip-embedding-note__missing">
          Visual similarity data not yet generated for this work.
        </p>
      )}
    </div>
  )
}

type Props = {
  slug: string
  hasClipEmbedding: boolean
}

const CLIP_INFO_URL = 'https://huggingface.co/openai/clip-vit-large-patch14'

export default function ClipEmbeddingNote({ slug, hasClipEmbedding }: Props) {
  if (!hasClipEmbedding) {
    return (
      <p className="clip-note">Visual similarity data not yet generated for this work.</p>
    )
  }

  return (
    <p className="clip-note">
      This work has a machine-readable visual fingerprint — a CLIP embedding — that AI systems use
      to find visually and conceptually related work across the archive.{' '}
      <a href={CLIP_INFO_URL} target="_blank" rel="noopener noreferrer">
        What is a CLIP embedding? ↗
      </a>{' '}
      <a href={`/${slug}/embedding`}>View this work&apos;s embedding →</a>
    </p>
  )
}

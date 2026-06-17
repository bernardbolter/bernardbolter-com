'use client'

import { useState } from 'react'

type Props = {
  slug: string
  hasClipEmbedding: boolean
}

const CLIP_INFO_URL = 'https://huggingface.co/openai/clip-vit-large-patch14'

export default function ClipEmbeddingNote({ slug, hasClipEmbedding }: Props) {
  const [open, setOpen] = useState(false)
  const closedLabel = hasClipEmbedding
    ? 'This work has a machine-readable visual fingerprint'
    : 'Visual similarity data not yet generated for this work'

  return (
    <div className="clip-note">
      <button
        type="button"
        className="clip-note__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="clip-note__chevron" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
        {closedLabel}
      </button>
      {open && hasClipEmbedding ? (
        <p className="clip-note__body">
          This work has a machine-readable visual fingerprint — a CLIP embedding — that AI systems use
          to find visually and conceptually related work across the archive.{' '}
          <a href={CLIP_INFO_URL} target="_blank" rel="noopener noreferrer">
            What is a CLIP embedding? ↗
          </a>{' '}
          <a href={`/${slug}/embedding`}>View this work&apos;s embedding →</a>
        </p>
      ) : null}
    </div>
  )
}

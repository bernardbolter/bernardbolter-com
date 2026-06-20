import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'

import {
  getDisplayImageUrl,
  getPrimaryMediaDimensions,
  resolveSeriesSlug,
} from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import { formatArtworkYearRange, resolveWallLabelMedium } from '@/lib/artwork/artworkLabels'
import type { SimilarArtworkCard } from '@/lib/payload/similarArtworksPage'
import type { Artwork } from '@/payload-types'
import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'
import { formatClipEmbeddingGeneratedAt } from '@/utilities/formatClipEmbeddingGeneratedAt'

import './artwork-page.css'
import './embedding-page.css'

const EMBEDDING_PROSE = {
  heading: 'A small, useful thing',
  paragraphs: [
    "This number — a list of 768 values, computed once from this image — comes from something called a CLIP embedding. It's a way of describing what's actually in a picture using mathematics instead of words: shapes, colors, composition, the visual relationships between things.",
    "Right now, it does something modest. It lets this archive quietly notice when one of my works visually echoes another — across thirty years and ten different bodies of work — without me having to manually tag every connection myself. The three pieces linked above this page weren't chosen by me. They were found by the numbers.",
    "But the more interesting case isn't really about my own archive at all.",
    "Artists, working alone, in different cities, different decades, sometimes arrive at strikingly similar visual ideas without ever knowing the other existed. No shared gallery, no studio crossover, no citation trail. That kind of connection is almost impossible to find through normal art-historical research, because it requires someone to have already known to look for it. A CLIP embedding doesn't need to know either artist's name, reputation, or market value to notice the resemblance — it just looks at what's there.",
    'If more artists made their work readable this way — openly, in public, the way this archive does — those kinds of connections wouldn\'t need to wait for the right curator or critic to stumble onto them by chance.',
    "They'd simply be findable.",
  ],
} as const

const VECTOR_VALUES_PER_LINE = 10
const VECTOR_PREVIEW_LINES = 8
const HERO_MAX_WIDTH = 1200
const SIMILAR_THUMB_MAX_WIDTH = 320

export type EmbeddingPageProps = {
  artwork: Artwork
  embedding: number[] | null
  generatedAt?: string | null
  similarWorks: SimilarArtworkCard[]
}

type SimilarWorkItem = {
  slug: string
  title: string
  imageUrl: string
  imageWidth: number
  imageHeight: number
  similarity?: number
}

function scaleToMaxWidth(
  width: number,
  height: number,
  maxWidth: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxWidth, height: Math.round(maxWidth * 0.75) }
  }
  if (width <= maxWidth) return { width, height }
  const scale = maxWidth / width
  return {
    width: maxWidth,
    height: Math.max(1, Math.round(height * scale)),
  }
}

function formatSimilarityScore(similarity: number | undefined): string | null {
  if (typeof similarity !== 'number' || !Number.isFinite(similarity)) return null
  return `${Math.round(similarity * 100)}% similarity`
}

function vectorPreviewLines(embedding: number[]): string[] {
  const previewCount = VECTOR_VALUES_PER_LINE * VECTOR_PREVIEW_LINES
  const preview = embedding.slice(0, previewCount)
  const lines: string[] = []

  for (let index = 0; index < preview.length; index += VECTOR_VALUES_PER_LINE) {
    const chunk = preview.slice(index, index + VECTOR_VALUES_PER_LINE)
    const formatted = chunk.map((value) => value.toFixed(6)).join(', ')
    if (index === 0) {
      lines.push(`[${formatted}`)
    } else {
      lines.push(` ${formatted}`)
    }
  }

  if (lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1]}, …]`
  }

  return lines.slice(0, VECTOR_PREVIEW_LINES)
}

function similarWorkItems(works: SimilarArtworkCard[]): SimilarWorkItem[] {
  return works
    .slice(0, 3)
    .map((work) => {
      const imageUrl = getDisplayImageUrl(work)
      if (!imageUrl || !work.slug?.trim()) return null
      const { width, height } = getPrimaryMediaDimensions(work)
      const display = scaleToMaxWidth(width, height, SIMILAR_THUMB_MAX_WIDTH)
      return {
        slug: work.slug.trim(),
        title: work.title?.trim() || 'Artwork',
        imageUrl,
        imageWidth: display.width,
        imageHeight: display.height,
        similarity: work.similarity,
      }
    })
    .filter((work): work is SimilarWorkItem => work !== null)
}

export default function EmbeddingPage({
  artwork,
  embedding,
  generatedAt,
  similarWorks,
}: EmbeddingPageProps) {
  const imageUrl = getDisplayImageUrl(artwork)
  const seriesColor = getSeriesColor(resolveSeriesSlug(artwork) ?? 'default')
  const thumbnails = similarWorkItems(similarWorks)
  const generatedLabel = formatClipEmbeddingGeneratedAt(generatedAt)
  const sourceDimensions = getPrimaryMediaDimensions(artwork)
  const heroDimensions = imageUrl
    ? scaleToMaxWidth(sourceDimensions.width, sourceDimensions.height, HERO_MAX_WIDTH)
    : null

  if (!embedding?.length) {
    return (
      <article className="embedding-page">
        <p className="embedding-page__missing">
          Visual similarity data has not yet been generated for this work.
        </p>
      </article>
    )
  }

  const vectorLines = vectorPreviewLines(embedding)

  return (
    <article className="embedding-page">
      <div className="embedding-page__hero-zone">
        <p className="embedding-page__hero-zone-eyebrow">
          Visual embedding · not the artwork page
        </p>

        {imageUrl && heroDimensions ? (
          <div className="embedding-page__hero-image">
            <Image
              src={imageUrl}
              alt={artwork.title ?? 'Artwork'}
              width={heroDimensions.width}
              height={heroDimensions.height}
              sizes="(min-width: 768px) 1200px, 90vw"
              className="embedding-page__hero-img"
              priority
            />
          </div>
        ) : null}

        <div className="embedding-page__title-block">
          <h1 className="artwork-image__title">{artwork.title}</h1>
          <h2 className="artwork-image__year">{formatArtworkYearRange(artwork)}</h2>
          <h3 className="artwork-image__medium">{resolveWallLabelMedium(artwork)}</h3>
        </div>
      </div>

      <p className="embedding-page__content-eyebrow">This work&apos;s visual embedding</p>

      <div
        className={`embedding-page__columns artwork-page__columns artwork-page__columns--data${
          thumbnails.length === 0 ? ' embedding-page__columns--single' : ''
        }`}
      >
        {thumbnails.length > 0 ? (
          <section className="embedding-page__column embedding-page__column--similar artwork-page__column artwork-page__column--prose">
            <div className="embedding-page__column-inner clip-embedding-note__similar">
              <div className="clip-embedding-note__similar-header">
                <h2 className="clip-embedding-note__similar-title">Similar works</h2>
                <span className="clip-embedding-note__similar-via">via visual similarity</span>
              </div>
              <div className="embedding-page__similar-grid">
                {thumbnails.map((work) => {
                  const scoreLabel = formatSimilarityScore(work.similarity)
                  return (
                    <Link
                      key={work.slug}
                      href={`/${work.slug}`}
                      className="embedding-page__similar-link"
                    >
                      <div className="embedding-page__similar-image">
                        <Image
                          src={work.imageUrl}
                          alt={work.title}
                          width={work.imageWidth}
                          height={work.imageHeight}
                          sizes="(min-width: 640px) 320px, 33vw"
                          className="embedding-page__similar-img"
                        />
                      </div>
                      <div className="embedding-page__similar-caption">
                        <p className="embedding-page__similar-title">{work.title}</p>
                        {scoreLabel ? (
                          <p className="embedding-page__similar-score">{scoreLabel}</p>
                        ) : null}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        ) : null}

        <section
          className="embedding-page__column embedding-page__column--text artwork-page__column artwork-page__column--record"
          aria-labelledby="embedding-prose-heading"
        >
          <div className="embedding-page__prose-panel">
            <h2 id="embedding-prose-heading" className="embedding-page__prose-heading">
              {EMBEDDING_PROSE.heading}
            </h2>
            {EMBEDDING_PROSE.paragraphs.map((paragraph) => (
              <p key={paragraph} className="embedding-page__prose-body">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      </div>

      <footer className="embedding-page__footer">
        <section
          className="embedding-page__metadata artwork-page__status-block"
          style={{ '--status-accent-color': seriesColor } as CSSProperties}
          aria-label="Embedding metadata"
        >
          <p className="embedding-page__metadata-row">
            <span className="embedding-page__metadata-label">Model</span>
            <span className="embedding-page__metadata-value">CLIP ViT-L/14</span>
          </p>
          <p className="embedding-page__metadata-row">
            <span className="embedding-page__metadata-label">Dimensions</span>
            <span className="embedding-page__metadata-value">{CLIP_EMBEDDING_DIMENSIONS}</span>
          </p>
          {generatedLabel ? (
            <p className="embedding-page__metadata-row">
              <span className="embedding-page__metadata-label">Generated</span>
              <span className="embedding-page__metadata-value">{generatedLabel}</span>
            </p>
          ) : null}
        </section>

        <section className="embedding-page__vector" aria-label="Vector preview">
          <p className="embedding-page__vector-label">The vector itself · not meant to be read</p>
          <div className="embedding-page__vector-preview">
            {vectorLines.map((line) => (
              <span key={line} className="embedding-page__vector-line">
                {line}
              </span>
            ))}
          </div>
        </section>
      </footer>
    </article>
  )
}

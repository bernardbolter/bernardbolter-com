import Link from 'next/link'

import ArtworkVisionAnalysisCard from '@/components/artwork/ArtworkVisionAnalysisCard'
import ArtworkVisualSimilarityCard from '@/components/artwork/ArtworkVisualSimilarityCard'
import type { SimilarWorkItem } from '@/components/artwork/similarWorkItem'
import { getArtworkImagePair, resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { latestVisionAnalysis } from '@/lib/artwork/visionPage'
import type { SimilarArtworkCard } from '@/lib/payload/similarArtworksPage'
import type { Artwork, ArtHistoricalReference, Tag } from '@/payload-types'

type Props = {
  artwork: Artwork
  similarWorks?: SimilarArtworkCard[] | null
  hasClipEmbedding: boolean
}

const TAG_COLORS: Record<Tag['type'], string> = {
  movement: '#7c5cbf',
  style: '#2a9d8f',
  subject: '#d4a017',
  genre: '#888888',
  period: '#888888',
}

type IntentField = {
  label: string
  value: string | null | undefined
  secondary?: boolean
}

function IntentBlock({ label, value, secondary }: IntentField) {
  if (!value?.trim()) return null
  return (
    <div className="artwork-image__info--about-wrapper mb-6">
      <h2>{label}</h2>
      <p
        className={`artwork-page__prose ${secondary ? 'artwork-page__prose--secondary' : ''} ${label === 'Contribution' ? 'artwork-page__prose--prominent' : ''}`}
      >
        {value}
      </p>
    </div>
  )
}

function tagList(tags: (number | Tag)[] | null | undefined): Tag[] {
  return (tags ?? []).filter((tag): tag is Tag => typeof tag === 'object' && tag !== null)
}

function aboutText(artwork: Artwork): string | null {
  const short = artwork.descriptionShort?.trim()
  const long = lexicalToPlain(artwork.descriptionLong)
  if (short && long) return `${short}\n\n${long}`
  return short || long || null
}

function similarWorkItems(works: SimilarArtworkCard[] | null | undefined): SimilarWorkItem[] {
  return (works ?? [])
    .slice(0, 3)
    .map((work) => {
      const imagePair = getArtworkImagePair(work, 'similar-works')
      if (!imagePair || !work.slug?.trim()) return null
      return {
        slug: work.slug.trim(),
        title: work.title?.trim() || 'Artwork',
        imageSrc: imagePair.src,
        imageFallback: imagePair.fallback,
      }
    })
    .filter((work): work is SimilarWorkItem => work !== null)
}

export default function Layer3ArtistAccount({ artwork, similarWorks, hasClipEmbedding }: Props) {
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const seriesColor = getSeriesColor(seriesSlug)

  const intentFields: IntentField[] = [
    { label: 'About the work', value: aboutText(artwork) },
    { label: 'Intent', value: artwork.intent },
    { label: 'Direct inspiration', value: artwork.directInspiration },
    { label: 'Making', value: artwork.makingNote },
    { label: 'Context of making', value: artwork.encounterNote },
    { label: 'Where it went', value: artwork.intentVsOutcome },
    { label: 'In the practice', value: artwork.workContext },
    { label: 'Process', value: artwork.processNotes, secondary: true },
    { label: 'Why these materials', value: artwork.materialAndProcessMeaning },
    { label: "What this isn't", value: artwork.consciousRejections },
    { label: 'In the series', value: artwork.seriesContext },
    { label: 'Source material', value: artwork.sourceMaterials },
  ]

  const tagGroups = [
    { type: 'movement', tags: tagList(artwork.movementTags) },
    { type: 'style', tags: tagList(artwork.styleTags) },
    { type: 'subject', tags: tagList(artwork.subjectTags) },
    { type: 'genre', tags: tagList(artwork.genreTags) },
    { type: 'period', tags: tagList(artwork.periodTags) },
  ] satisfies Array<{ type: Tag['type']; tags: Tag[] }>

  const populatedTagGroups = tagGroups.filter((group) => group.tags.length > 0)

  const references = (artwork.artHistoricalReferences ?? []).filter(
    (ref): ref is ArtHistoricalReference => typeof ref === 'object' && ref !== null,
  )

  const hasClassification =
    populatedTagGroups.length > 0 || (artwork.conceptualKeywords ?? []).some((row) => row.keyword?.trim())

  const latestAnalysis = latestVisionAnalysis(artwork)
  const artworkSlug = artwork.slug?.trim() || ''
  const similarItems = similarWorkItems(similarWorks)

  return (
    <section className="artwork-page__layer">
      <div className="artwork-page__inner">
        {latestAnalysis ? (
          <ArtworkVisionAnalysisCard artwork={artwork} seriesColor={seriesColor} />
        ) : null}

        {hasClipEmbedding ? (
          <ArtworkVisualSimilarityCard
            artworkSlug={artworkSlug}
            seriesColor={seriesColor}
            similarWorks={similarItems}
          />
        ) : null}

        <IntentBlock label="Contribution" value={artwork.formalContributionAssessment} />

        {intentFields.map((field) => (
          <IntentBlock key={field.label} {...field} />
        ))}

        {artwork.artHistoricalContext || references.length > 0 ? (
          <>
            <hr className="artwork-page__divider" />
            {artwork.artHistoricalContext ? (
              <p className="artwork-page__prose mb-4">{artwork.artHistoricalContext}</p>
            ) : null}
            {references.map((ref) => (
              <div key={ref.id} className="mb-4 text-sm">
                <p className="font-medium">
                  {[ref.artistName, ref.artworkTitle, ref.yearCreated].filter(Boolean).join(' · ')}
                </p>
                {ref.notes ? <p className="artwork-page__prose mt-1">{ref.notes}</p> : null}
                {ref.referenceUrl ? (
                  <a
                    href={ref.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary text-xs"
                  >
                    Reference ↗
                  </a>
                ) : null}
              </div>
            ))}
          </>
        ) : null}

        <div className="artwork-page__classification-cluster">
        {hasClassification ? (
          <>
            <hr className="artwork-page__divider" />
            <div className="flex flex-wrap gap-1">
              {populatedTagGroups.map((group) =>
                group.tags.map((tag) => (
                  <span
                    key={`${group.type}-${tag.id}`}
                    className="artwork-chip"
                    style={{ backgroundColor: `${TAG_COLORS[group.type]}22`, color: TAG_COLORS[group.type] }}
                  >
                    {tag.label}
                    {tag.aatUri ? (
                      <a
                        href={tag.aatUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 opacity-70"
                        aria-label={`AAT entry for ${tag.label}`}
                      >
                        ↗
                      </a>
                    ) : null}
                  </span>
                )),
              )}
              {(artwork.conceptualKeywords ?? []).map((row) =>
                row.keyword?.trim() ? (
                  <span
                    key={row.id ?? row.keyword}
                    className="artwork-chip artwork-chip--conceptual"
                    style={{ backgroundColor: `${seriesColor}22`, color: seriesColor }}
                  >
                    {row.keyword}
                  </span>
                ) : null,
              )}
            </div>
          </>
        ) : null}
        </div>
      </div>
    </section>
  )
}

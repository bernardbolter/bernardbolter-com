'use client'

import VisionComparisonGrid, { type ComparisonItem } from '@/components/artwork/VisionComparisonGrid'
import {
  analysisPreview,
  formatMonthYear,
  formatVisionModelLabel,
  type VisionAnalysisEntry,
} from '@/lib/artwork/visionPage'

type Props = {
  analyses: VisionAnalysisEntry[]
  seriesColor: string
}

export default function VisionAnalysesSection({ analyses, seriesColor }: Props) {
  const items: ComparisonItem[] = analyses.map((analysis, index) => ({
    id: String(index),
    modelLabel: formatVisionModelLabel(analysis.model),
    dateLabel: formatMonthYear(analysis.date),
    preview: analysisPreview(analysis.text),
    body: <p className="vision-page__analysis-text">{analysis.text}</p>,
  }))

  return <VisionComparisonGrid items={items} seriesColor={seriesColor} />
}

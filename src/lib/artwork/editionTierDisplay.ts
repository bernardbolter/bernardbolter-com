import { buildWidthHeightDimensionsDisplay } from '@/lib/dimensions/physicalDimensions'

export const PRINT_SUBSTRATE_LABELS: Record<string, string> = {
  paper: 'Paper',
  'aluminum-mount': 'Aluminum mount',
  canvas: 'Canvas',
  'oil-on-canvas': 'Oil on canvas',
}

export const PRINT_TECHNIQUE_LABELS: Record<string, string> = {
  giclee: 'Giclée',
  'pigment-print': 'Pigment print',
  screenprint: 'Screenprint',
  lithograph: 'Lithograph',
  etching: 'Etching',
  'digital-c-print': 'Digital C-print',
  other: 'Other',
}

export type EditionTierSpecInput = {
  editionSize?: number | null
  apCount?: number | null
  dimensionUnit?: string | null
  widthWhole?: number | null
  widthFraction?: string | null
  heightWhole?: number | null
  heightFraction?: string | null
  /** Legacy cm fields — used when whole/fraction not set */
  widthCm?: number | null
  heightCm?: number | null
  /** Preformatted fallback (Megacities local dimensions string) */
  dimensions?: string | null
  substrate?: string | null
  printTechnique?: string | null
}

export function humanizeEditionVocabularyValue(value: string): string {
  if (value.includes(' ') || /[À-ÿ]/.test(value)) return value
  return value
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function substrateLabel(
  substrate: string | null | undefined,
  extraLabels?: Record<string, string>,
): string | null {
  const trimmed = substrate?.trim()
  if (!trimmed) return null
  return extraLabels?.[trimmed] ?? PRINT_SUBSTRATE_LABELS[trimmed] ?? humanizeEditionVocabularyValue(trimmed)
}

export function printTechniqueLabel(
  technique: string | null | undefined,
  extraLabels?: Record<string, string>,
): string | null {
  const trimmed = technique?.trim()
  if (!trimmed) return null
  return (
    extraLabels?.[trimmed] ??
    PRINT_TECHNIQUE_LABELS[trimmed] ??
    humanizeEditionVocabularyValue(trimmed)
  )
}

export type EditionTierLabelMaps = {
  substrates?: Record<string, string>
  printTechniques?: Record<string, string>
}

export function formatEditionTierDimensions(input: EditionTierSpecInput): string | null {
  const fromFields = buildWidthHeightDimensionsDisplay(
    {
      widthWhole: input.widthWhole,
      widthFraction: input.widthFraction,
      heightWhole: input.heightWhole,
      heightFraction: input.heightFraction,
    },
    input.dimensionUnit,
  )
  if (fromFields) return fromFields

  if (input.widthCm != null && input.heightCm != null) {
    return `${input.widthCm} × ${input.heightCm} cm`
  }

  const dimensions = input.dimensions?.trim()
  return dimensions || null
}

export function formatEditionSizeLabel(
  editionSize?: number | null,
  apCount?: number | null,
): string | null {
  const size = editionSize ?? 0
  if (size <= 0) return null
  const ap = apCount ?? 0
  if (ap > 0) return `Edition of ${size} + ${ap} AP`
  return `Edition of ${size}`
}

/** Ordered spec fragments for display — size, dimensions, technique, substrate. */
export function buildEditionTierSpecParts(
  input: EditionTierSpecInput,
  labelMaps?: EditionTierLabelMaps,
): string[] {
  const parts: string[] = []

  const editionLabel = formatEditionSizeLabel(input.editionSize, input.apCount)
  if (editionLabel) parts.push(editionLabel)

  const dimensions = formatEditionTierDimensions(input)
  if (dimensions) parts.push(dimensions)

  const technique = printTechniqueLabel(input.printTechnique, labelMaps?.printTechniques)
  if (technique) parts.push(technique)

  const substrate = substrateLabel(input.substrate, labelMaps?.substrates)
  if (substrate) parts.push(`on ${substrate}`)

  return parts
}

export function buildEditionTierSpecLine(
  input: EditionTierSpecInput,
  labelMaps?: EditionTierLabelMaps,
): string | null {
  const parts = buildEditionTierSpecParts(input, labelMaps)
  if (parts.length === 0) return null
  return parts.join(' · ')
}

import type { Event } from '@/payload-types'

export type StagedInstallationImage = {
  id: string
  mediaId: number
  caption?: string
  altText?: string
  artworksShown?: number[]
}

export type StagedEventMedia = {
  artworkIds: number[]
  installationImages: StagedInstallationImage[]
}

function newRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `new-${crypto.randomUUID()}`
  }
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyStagedEventMedia(): StagedEventMedia {
  return { artworkIds: [], installationImages: [] }
}

function readRelationshipId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = Number((value as { id: unknown }).id)
    return Number.isFinite(id) ? id : null
  }
  return null
}

export function normalizeStagedEventMedia(raw: unknown): StagedEventMedia {
  if (!raw || typeof raw !== 'object') return emptyStagedEventMedia()

  const data = raw as {
    artworkIds?: unknown
    installationImages?: unknown
  }

  const artworkIds = Array.isArray(data.artworkIds)
    ? [...new Set(data.artworkIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)))]
    : []

  const installationImages: StagedInstallationImage[] = []
  if (Array.isArray(data.installationImages)) {
    for (const row of data.installationImages) {
      if (!row || typeof row !== 'object') continue
      const mediaId = readRelationshipId((row as { mediaId?: unknown }).mediaId)
      if (mediaId == null) continue
      const id =
        typeof (row as { id?: unknown }).id === 'string' && (row as { id: string }).id.trim()
          ? (row as { id: string }).id.trim()
          : newRowId()
      const artworksShown = Array.isArray((row as { artworksShown?: unknown }).artworksShown)
        ? [
            ...new Set(
              (row as { artworksShown: unknown[] }).artworksShown
                .map((entry) => readRelationshipId(entry))
                .filter((entry): entry is number => entry != null),
            ),
          ]
        : undefined

      installationImages.push({
        id,
        mediaId,
        caption:
          typeof (row as { caption?: unknown }).caption === 'string'
            ? (row as { caption: string }).caption
            : undefined,
        altText:
          typeof (row as { altText?: unknown }).altText === 'string'
            ? (row as { altText: string }).altText
            : undefined,
        artworksShown,
      })
    }
  }

  return { artworkIds, installationImages }
}

export function seedStagedEventMediaFromEvent(
  event: Event,
  existing?: unknown,
): StagedEventMedia {
  const normalized = normalizeStagedEventMedia(existing)
  if (normalized.artworkIds.length > 0 || normalized.installationImages.length > 0) {
    return normalized
  }

  const artworkIds = (event.artworks ?? [])
    .map((entry) => readRelationshipId(entry))
    .filter((id): id is number => id != null)

  const installationImages = (event.installationImages ?? []).flatMap((row) => {
    const mediaId = readRelationshipId(row.image)
    if (mediaId == null) return []
    const image: StagedInstallationImage = {
      id: typeof row.id === 'string' && row.id.trim() ? row.id : newRowId(),
      mediaId,
      artworksShown: (row.artworksShown ?? [])
        .map((entry) => readRelationshipId(entry))
        .filter((id): id is number => id != null),
    }
    if (row.caption) image.caption = row.caption
    if (row.altText) image.altText = row.altText
    return [image]
  })

  return { artworkIds, installationImages }
}

export function hasStagedEventMedia(raw: unknown): boolean {
  const staged = normalizeStagedEventMedia(raw)
  return staged.artworkIds.length > 0 || staged.installationImages.length > 0
}

export function mergeStagedEventMediaIntoEventPatch(
  patch: Record<string, unknown>,
  stagedRaw: unknown,
): Record<string, unknown> {
  const staged = normalizeStagedEventMedia(stagedRaw)
  const out = { ...patch }

  if (staged.artworkIds.length > 0) {
    out.artworks = staged.artworkIds
  }

  if (staged.installationImages.length > 0) {
    out.installationImages = staged.installationImages.map((row) => ({
      ...(row.id.startsWith('new-') ? {} : { id: row.id }),
      image: row.mediaId,
      ...(row.caption?.trim() ? { caption: row.caption.trim() } : {}),
      ...(row.altText?.trim() ? { altText: row.altText.trim() } : {}),
      ...(row.artworksShown?.length ? { artworksShown: row.artworksShown } : {}),
    }))
  }

  return out
}

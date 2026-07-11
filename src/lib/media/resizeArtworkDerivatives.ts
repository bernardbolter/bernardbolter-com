import sharp from 'sharp'

import {
  ARTWORK_DERIVATIVE_SIZES,
  derivativeObjectKey,
  type ArtworkDerivativeSuffix,
} from '@/lib/media/artworkR2Images'
import {
  fetchR2ObjectBufferFromUrl,
  r2ObjectExists,
  uploadR2Jpeg,
} from '@/lib/media/r2Object'

export type ResizeArtworkDerivativesResult = {
  slug: string
  generated: ArtworkDerivativeSuffix[]
  skipped: ArtworkDerivativeSuffix[]
  errors: Array<{ suffix: ArtworkDerivativeSuffix; message: string }>
}

export async function resizeArtworkDerivatives(
  slug: string,
  imageUrl: string,
): Promise<ResizeArtworkDerivativesResult> {
  const trimmedSlug = slug.trim()
  if (!trimmedSlug) {
    throw new Error('Artwork slug is required for derivative generation')
  }

  const result: ResizeArtworkDerivativesResult = {
    slug: trimmedSlug,
    generated: [],
    skipped: [],
    errors: [],
  }

  let inputBuffer: Buffer
  try {
    inputBuffer = await fetchR2ObjectBufferFromUrl(imageUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to fetch original image for ${trimmedSlug}: ${message}`)
  }

  const metadata = await sharp(inputBuffer).metadata()
  const originalWidth = metadata.width ?? 0

  for (const size of ARTWORK_DERIVATIVE_SIZES) {
    const objectKey = derivativeObjectKey(trimmedSlug, size.suffix)

    try {
      if (await r2ObjectExists(objectKey)) {
        result.skipped.push(size.suffix)
        continue
      }

      if (originalWidth > 0 && originalWidth < size.width) {
        result.skipped.push(size.suffix)
        continue
      }

      const resized = await sharp(inputBuffer)
        .resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer()

      await uploadR2Jpeg(objectKey, resized)
      result.generated.push(size.suffix)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      result.errors.push({ suffix: size.suffix, message })
    }
  }

  return result
}

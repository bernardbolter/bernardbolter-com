import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'

import { getR2Bucket, getS3Client } from '@/lib/studio/r2'

export function getR2PublicBase(): string {
  const domain = process.env.NEXT_PUBLIC_IMAGE_DOMAIN?.replace(/\/$/, '')
  if (!domain) {
    throw new Error('NEXT_PUBLIC_IMAGE_DOMAIN is not configured')
  }
  return domain
}

/** Strip cache-bust query params from a media URL. */
export function stripMediaUrlVersion(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  try {
    const parsed = new URL(trimmed)
    parsed.searchParams.delete('v')
    const search = parsed.searchParams.toString()
    return `${parsed.origin}${parsed.pathname}${search ? `?${search}` : ''}`
  } catch {
    return trimmed.split('?')[0] ?? trimmed
  }
}

/** Resolve the R2 object key from a public CDN URL. */
export function objectKeyFromPublicUrl(url: string): string {
  const normalized = stripMediaUrlVersion(url)

  try {
    const pathname = new URL(normalized).pathname.replace(/^\//, '')
    return decodeURIComponent(pathname)
  } catch {
    const base = getR2PublicBase()
    const rawKey = normalized.startsWith(`${base}/`)
      ? normalized.slice(base.length + 1)
      : normalized.replace(/^\//, '')
    return decodeURIComponent(rawKey)
  }
}

export function publicUrlForObjectKey(objectKey: string): string {
  return `${getR2PublicBase()}/${objectKey.replace(/^\//, '')}`
}

export async function r2ObjectExists(objectKey: string): Promise<boolean> {
  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: getR2Bucket(),
        Key: objectKey,
      }),
    )
    return true
  } catch {
    return false
  }
}

export async function fetchR2ObjectBuffer(objectKey: string): Promise<Buffer> {
  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: getR2Bucket(),
      Key: objectKey,
    }),
  )

  const body = response.Body
  if (!body) {
    throw new Error(`Empty R2 object body for key ${objectKey}`)
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body)
  }

  const chunks: Uint8Array[] = []
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export async function uploadR2Jpeg(objectKey: string, body: Buffer): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: objectKey,
      Body: body,
      ContentType: 'image/jpeg',
    }),
  )
}

export async function fetchR2ObjectBufferFromUrl(imageUrl: string): Promise<Buffer> {
  const objectKey = objectKeyFromPublicUrl(imageUrl)
  return fetchR2ObjectBuffer(objectKey)
}

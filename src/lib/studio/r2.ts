import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const PRESIGN_EXPIRES_SECONDS = 900

let s3Client: S3Client | null = null

export function getR2Bucket(): string {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) {
    throw new Error('R2_BUCKET_NAME is not configured')
  }
  return bucket
}

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT || '',
      forcePathStyle: true,
    })
  }
  return s3Client
}

export function sanitizeUploadFilename(filename: string): string {
  const base = filename.replace(/\\/g, '/').split('/').pop() ?? 'upload'
  const cleaned = base.replace(/[^\w.\-()+ ]+/g, '_').trim()
  return cleaned || 'upload'
}

/** `field-notes/{YYYY}/{MM}/{uuid}-{filename}` */
export function buildFieldNoteObjectKey(filename: string, now = new Date()): string {
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const safeName = sanitizeUploadFilename(filename)
  return `field-notes/${year}/${month}/${crypto.randomUUID()}-${safeName}`
}

export function getPublicUrlForObjectKey(objectKey: string): string {
  const domain = process.env.NEXT_PUBLIC_IMAGE_DOMAIN?.replace(/\/$/, '')
  if (!domain) {
    throw new Error('NEXT_PUBLIC_IMAGE_DOMAIN is not configured')
  }
  return `${domain}/${objectKey}`
}

export async function createPresignedPutUrl(
  objectKey: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: objectKey,
    ContentType: contentType,
  })
  return getSignedUrl(getS3Client(), command, { expiresIn: PRESIGN_EXPIRES_SECONDS })
}

export function mediaAltFromObjectKey(objectKey: string): string {
  const basename = objectKey.split('/').pop() ?? 'Field note'
  const withoutUuid = basename.replace(/^[0-9a-f-]{36}-/i, '')
  const stem = withoutUuid.replace(/\.[^.]+$/, '').trim()
  return stem || 'Field note upload'
}

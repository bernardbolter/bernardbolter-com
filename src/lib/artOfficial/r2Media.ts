import { sanitizeUploadFilename } from '@/lib/studio/r2'

/** `art-official-media/{YYYY}/{MM}/{uuid}-{filename}` */
export function buildArtOfficialMediaObjectKey(filename: string, now = new Date()): string {
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const safeName = sanitizeUploadFilename(filename)
  return `art-official-media/${year}/${month}/${crypto.randomUUID()}-${safeName}`
}

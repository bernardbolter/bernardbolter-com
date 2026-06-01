const VIDEO_EXT_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

/** Browser/OS variants that Payload `media` upload mimeTypes do not list explicitly. */
const VIDEO_MIME_ALIASES: Record<string, string> = {
  'video/x-m4v': 'video/mp4',
  'video/m4v': 'video/mp4',
  'application/mp4': 'video/mp4',
}

export function normalizeVideoMimeType(mimeType: string): string {
  const key = mimeType.trim().toLowerCase()
  return VIDEO_MIME_ALIASES[key] ?? mimeType.trim()
}

export function resolveMediaMimeType(file: File): string {
  const type = file.type?.trim()
  let mime: string
  if (type) {
    mime = type
  } else {
    const ext = file.name.split('.').pop()?.toLowerCase()
    mime = (ext && VIDEO_EXT_MIME[ext]) || 'application/octet-stream'
  }

  if (mime.toLowerCase().startsWith('video/')) {
    return normalizeVideoMimeType(mime)
  }
  return mime
}

export function isVideoMediaFile(file: File): boolean {
  return resolveMediaMimeType(file).startsWith('video/')
}

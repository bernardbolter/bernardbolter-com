const VIDEO_EXT_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

const AUDIO_EXT_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  wave: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  aif: 'audio/aiff',
  aiff: 'audio/aiff',
  caf: 'audio/x-caf',
}

/** Browser/OS variants that Payload `media` upload mimeTypes do not list explicitly. */
const VIDEO_MIME_ALIASES: Record<string, string> = {
  'video/x-m4v': 'video/mp4',
  'video/m4v': 'video/mp4',
  'application/mp4': 'video/mp4',
}

/** iOS / GarageBand often report these instead of the canonical types. */
const AUDIO_MIME_ALIASES: Record<string, string> = {
  'audio/x-m4a': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
  'audio/x-mp4': 'audio/mp4',
  'audio/mp4a-latm': 'audio/mp4',
  'audio/x-aac': 'audio/aac',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/vnd.wave': 'audio/wav',
  'audio/x-aiff': 'audio/aiff',
  'audio/aif': 'audio/aiff',
  'audio/caf': 'audio/x-caf',
}

export function normalizeVideoMimeType(mimeType: string): string {
  const key = mimeType.trim().toLowerCase()
  return VIDEO_MIME_ALIASES[key] ?? mimeType.trim()
}

export function normalizeAudioMimeType(mimeType: string): string {
  const key = mimeType.trim().toLowerCase()
  return AUDIO_MIME_ALIASES[key] ?? mimeType.trim()
}

function extensionOf(filename: string): string | undefined {
  return filename.split('.').pop()?.toLowerCase()
}

export function resolveMediaMimeType(file: File): string {
  const type = file.type?.trim().toLowerCase() || ''
  const ext = extensionOf(file.name)
  const fromExt = ext ? VIDEO_EXT_MIME[ext] || AUDIO_EXT_MIME[ext] : undefined

  // Prefer extension when the browser gives a useless/generic type (common on iOS Files).
  const generic = !type || type === 'application/octet-stream'
  let mime = generic ? fromExt || type || 'application/octet-stream' : type

  // GarageBand / iOS often labels .m4a as video/mp4.
  if (ext === 'm4a' && (mime === 'video/mp4' || mime === 'application/mp4')) {
    mime = 'audio/mp4'
  }

  if (mime.startsWith('video/')) {
    return normalizeVideoMimeType(mime)
  }
  if (mime.startsWith('audio/')) {
    return normalizeAudioMimeType(mime)
  }
  return mime
}

export function isVideoMediaFile(file: File): boolean {
  return resolveMediaMimeType(file).startsWith('video/')
}

export function isAudioMediaFile(file: File): boolean {
  return resolveMediaMimeType(file).startsWith('audio/')
}

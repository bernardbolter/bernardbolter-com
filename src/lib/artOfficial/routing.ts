export type SessionType =
  | 'artwork-cataloguing'
  | 'triptych-cataloguing'
  | 'artist-statement'
  | 'biography'
  | 'onboarding'
  | 'episode-storyboard'
  | 'episode-assembly'

export const SESSION_TYPES: SessionType[] = [
  'artwork-cataloguing',
  'triptych-cataloguing',
  'artist-statement',
  'biography',
  'onboarding',
  'episode-storyboard',
  'episode-assembly',
]

export function requiresArtwork(t: SessionType): boolean {
  return t === 'artwork-cataloguing'
}

export function requiresTriptych(t: SessionType): boolean {
  return t === 'triptych-cataloguing'
}

export function requiresEpisode(t: SessionType): boolean {
  return t === 'episode-storyboard' || t === 'episode-assembly'
}

export type CommitTarget =
  | { kind: 'create-artwork' }
  | { kind: 'create-triptych' }
  | { kind: 'update-artist-singleton' }
  | { kind: 'update-episode' }
  | { kind: 'no-record-write' }

export function commitTarget(t: SessionType): CommitTarget {
  switch (t) {
    case 'artwork-cataloguing':
      return { kind: 'create-artwork' }
    case 'triptych-cataloguing':
      return { kind: 'create-triptych' }
    case 'artist-statement':
    case 'biography':
      return { kind: 'update-artist-singleton' }
    case 'episode-storyboard':
    case 'episode-assembly':
      return { kind: 'update-episode' }
    case 'onboarding':
      return { kind: 'no-record-write' }
    default: {
      const _exhaustive: never = t
      return _exhaustive
    }
  }
}

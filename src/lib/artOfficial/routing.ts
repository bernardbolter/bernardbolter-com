export type SessionType =
  | 'artwork-cataloguing'
  | 'artist-statement'
  | 'biography'
  | 'onboarding'

export const SESSION_TYPES: SessionType[] = [
  'artwork-cataloguing',
  'artist-statement',
  'biography',
  'onboarding',
]

export function requiresArtwork(t: SessionType): boolean {
  return t === 'artwork-cataloguing'
}

export type CommitTarget =
  | { kind: 'create-artwork' }
  | { kind: 'update-artist-singleton' }
  | { kind: 'no-record-write' }

export function commitTarget(t: SessionType): CommitTarget {
  switch (t) {
    case 'artwork-cataloguing':
      return { kind: 'create-artwork' }
    case 'artist-statement':
    case 'biography':
      return { kind: 'update-artist-singleton' }
    case 'onboarding':
      return { kind: 'no-record-write' }
    default: {
      const _exhaustive: never = t
      return _exhaustive
    }
  }
}

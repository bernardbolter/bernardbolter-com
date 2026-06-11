export type SessionType =
  | 'artwork-cataloguing'
  | 'triptych-cataloguing'
  | 'artist-statement'
  | 'biography'
  | 'onboarding'
  | 'sequencing'
  | 'episode-storyboard'
  | 'episode-assembly'
  | 'event-enrichment'

export const SESSION_TYPES: SessionType[] = [
  'artwork-cataloguing',
  'triptych-cataloguing',
  'artist-statement',
  'biography',
  'onboarding',
  'sequencing',
  'episode-storyboard',
  'episode-assembly',
  'event-enrichment',
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

export function requiresEvent(t: SessionType): boolean {
  return t === 'event-enrichment'
}

export type CommitTarget =
  | { kind: 'create-artwork' }
  | { kind: 'create-triptych' }
  | { kind: 'apply-sequencing' }
  | { kind: 'update-artist-singleton' }
  | { kind: 'update-episode' }
  | { kind: 'update-event' }
  | { kind: 'no-record-write' }

export function commitTarget(t: SessionType): CommitTarget {
  switch (t) {
    case 'artwork-cataloguing':
      return { kind: 'create-artwork' }
    case 'triptych-cataloguing':
      return { kind: 'create-triptych' }
    case 'sequencing':
      return { kind: 'apply-sequencing' }
    case 'artist-statement':
    case 'biography':
      return { kind: 'update-artist-singleton' }
    case 'episode-storyboard':
    case 'episode-assembly':
      return { kind: 'update-episode' }
    case 'event-enrichment':
      return { kind: 'update-event' }
    case 'onboarding':
      return { kind: 'no-record-write' }
    default: {
      const _exhaustive: never = t
      return _exhaustive
    }
  }
}

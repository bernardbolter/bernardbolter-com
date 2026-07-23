export type SessionType =
  | 'artwork-cataloguing'
  | 'triptych-cataloguing'
  | 'connected-reading'
  | 'artist-statement'
  | 'biography'
  | 'onboarding'
  | 'annual-snapshot'
  | 'sequencing'
  | 'episode-storyboard'
  | 'episode-assembly'
  | 'event-enrichment'
  | 'corpus-revisit'

export const SESSION_TYPES: SessionType[] = [
  'artwork-cataloguing',
  'triptych-cataloguing',
  'connected-reading',
  'artist-statement',
  'biography',
  'onboarding',
  'annual-snapshot',
  'sequencing',
  'episode-storyboard',
  'episode-assembly',
  'event-enrichment',
  'corpus-revisit',
]

export function requiresArtwork(t: SessionType): boolean {
  return t === 'artwork-cataloguing' || t === 'corpus-revisit'
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
    case 'annual-snapshot':
      return { kind: 'update-artist-singleton' }
    case 'episode-storyboard':
    case 'episode-assembly':
      return { kind: 'update-episode' }
    case 'event-enrichment':
      return { kind: 'update-event' }
    case 'onboarding':
    case 'connected-reading':
      return { kind: 'no-record-write' }
    case 'corpus-revisit':
      return { kind: 'create-artwork' }
    default: {
      const _exhaustive: never = t
      return _exhaustive
    }
  }
}

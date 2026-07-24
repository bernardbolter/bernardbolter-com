import type { Session } from '@/payload-types'

const SESSION_TYPE_LABELS: Record<string, string> = {
  'artwork-cataloguing': 'Cataloguing pass',
  'corpus-revisit': 'Corpus revisit',
  'artist-statement': 'Artist statement',
  biography: 'Biography',
  onboarding: 'Onboarding',
  'event-enrichment': 'Event enrichment',
  'connected-reading': 'Connected reading',
  'annual-snapshot': 'Annual snapshot',
  sequencing: 'Sequencing',
  'triptych-cataloguing': 'Triptych cataloguing',
  'episode-storyboard': 'Episode storyboard',
  'episode-assembly': 'Episode assembly',
}

function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

export type SessionGlossInput = {
  sessionType: string
  fieldsCoveredThisSession?: Array<{ field?: string | null } | null> | null
  revisitOf?: number | Session | null
  passNumber?: number | null
  linchpinFlag?: { isLinchpin?: boolean | null } | null
  sessionStruggleFlag?: {
    hasStruggle?: boolean | null
    struggleTypes?: string[] | null
  } | null
  priorFieldConflicts?: Array<unknown> | null
}

/**
 * Short honest gloss for /sessions index (sessions-audit-cursor-spec Part 4).
 */
export function buildSessionGloss(input: SessionGlossInput): string {
  const covered = (input.fieldsCoveredThisSession ?? []).filter(
    (row) => row && typeof row.field === 'string' && row.field.trim(),
  ).length
  const typeLabel = SESSION_TYPE_LABELS[input.sessionType] ?? input.sessionType.replace(/-/g, ' ')

  let gloss = `${typeLabel} — ${covered} field${covered === 1 ? '' : 's'} confirmed`

  if (input.revisitOf != null && input.passNumber != null && input.passNumber > 1) {
    gloss = `Revisit (${ordinal(input.passNumber)} pass on this artwork) — ${covered} field${covered === 1 ? '' : 's'} confirmed`
  }

  const conflicts = Array.isArray(input.priorFieldConflicts)
    ? input.priorFieldConflicts.length
    : 0
  if (conflicts > 0) {
    gloss += `, ${conflicts} field conflict${conflicts === 1 ? '' : 's'} resolved`
  }

  if (input.sessionStruggleFlag?.hasStruggle) {
    const types = input.sessionStruggleFlag.struggleTypes ?? []
    if (types.length === 1) {
      const label = types[0]?.replace(/-/g, ' ') ?? 'struggle'
      gloss += `, 1 ${label} flagged`
    } else if (types.length > 1) {
      gloss += `, ${types.length} struggles flagged`
    } else {
      gloss += ', struggle flagged'
    }
  }

  return gloss
}

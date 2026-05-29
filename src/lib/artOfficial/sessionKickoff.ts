import type { SessionType } from './routing'

export type SessionKickoff = {
  title: string
  intro: string
  topics?: string[]
  buttonLabel: string
  message: string
}

const KICKOFFS: Record<SessionType, SessionKickoff | null> = {
  onboarding: {
    title: 'Onboarding',
    intro:
      'This is a structured interview about your practice — no artwork upload. The agent will ask one question at a time and stage updates for Practice Knowledge. You commit when you are satisfied.',
    topics: [
      'How you describe your practice overall',
      'Series and bodies of work',
      'Visual language and recurring motifs',
      'Art-historical touchstones and references',
      'Preferred vocabulary and framings',
    ],
    buttonLabel: 'Begin onboarding',
    message:
      "I'm ready to start onboarding. Please welcome me briefly, explain what we'll cover, and ask your first question about my practice.",
  },
  'artist-statement': {
    title: 'Artist statement',
    intro:
      'Work through your statement in conversation. The agent will draft and stage text for your review before commit.',
    buttonLabel: 'Begin statement session',
    message:
      "I'd like to work on my artist statement. Please begin — ask what you need first, one question at a time.",
  },
  biography: {
    title: 'Biography',
    intro:
      'Build or refresh biography text and related CV material through dialogue. Commit applies updates to your Artist record and related knowledge.',
    buttonLabel: 'Begin biography session',
    message:
      "I'd like to work on my biography. Please begin — ask what you need first, one question at a time.",
  },
  'artwork-cataloguing': {
    title: 'Artwork cataloguing',
    intro:
      'One artwork per session. You will answer four short pre-upload questions in chat (including a blind description before either of you sees the file), then upload a still image of the work and continue cataloguing with that image in view.',
    topics: [
      'How long you have lived with the work (time)',
      'Whether it belongs to an ongoing series or stands alone',
      'Where you were when you made it',
      'A blind description from memory — before upload',
    ],
    buttonLabel: 'Begin cataloguing',
    message:
      "I'd like to catalogue an artwork. Please open with your briefing on my practice (brief, no generic welcome), then ask your first pre-upload question.",
  },
  'triptych-cataloguing': {
    title: 'Triptych cataloguing',
    intro:
      'Document one MoP triptych as a single work — intent, series context, and descriptions that span all three panels. Panel wiring and commerce stay in the Triptychs admin.',
    topics: [
      'How the three technologies relate to the same place',
      'Intent and meaning of the set as a whole',
      'Art-historical framing across the arc',
      'Formal contribution of the triptych',
    ],
    buttonLabel: 'Begin triptych session',
    message:
      "I'd like to catalogue a triptych. Please welcome me briefly, confirm we're documenting one MoP set (not a single panel), and ask your first question.",
  },
  'episode-storyboard': {
    title: 'Episode storyboard',
    intro:
      'Structure this MoP episode as named beats before shooting. The agent stages storyboard rows on the episode record.',
    buttonLabel: 'Begin storyboard session',
    message:
      "I'd like to storyboard this episode. Please review the concept and ask your first question about beat structure.",
  },
  'episode-assembly': {
    title: 'Episode assembly',
    intro:
      'Map tagged clips and transcripts to beats for the edit. Uses FieldNotes linked to this episode.',
    buttonLabel: 'Begin assembly session',
    message:
      "I'd like to assemble this episode from clips. Please review linked FieldNotes and ask your first question about the edit map.",
  },
}

export function getSessionKickoff(sessionType: string | null | undefined): SessionKickoff | null {
  if (!sessionType || !(sessionType in KICKOFFS)) return null
  return KICKOFFS[sessionType as SessionType]
}

const KICKOFF_MESSAGES = new Set(
  Object.values(KICKOFFS)
    .filter((k): k is SessionKickoff => k !== null)
    .map((k) => k.message),
)

/** Hidden “start session” prompts sent via Begin — not shown as a You bubble. */
export function isSessionKickoffMessage(content: string): boolean {
  return KICKOFF_MESSAGES.has(content.trim())
}

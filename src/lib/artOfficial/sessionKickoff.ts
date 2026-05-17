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
  'artwork-cataloguing': null,
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

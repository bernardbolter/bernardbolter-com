import type { SessionType } from './routing'

export type SessionKickoff = {
  title: string
  intro: string
  topics?: string[]
  buttonLabel: string
  message: string
}

const KICKOFFS: Record<SessionType | 'artwork-cataloguing-refinement', SessionKickoff | null> = {
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
  'artwork-cataloguing-refinement': {
    title: 'Artwork update',
    intro:
      'Continuing cataloguing on an existing artwork. The agent knows what is already filled and will focus the conversation on the gaps — missing context, provenance, reflective fields, and series data.',
    buttonLabel: 'Begin refinement',
    message:
      "I'd like to add to and refine the cataloguing for this existing artwork. Please review what's already captured, summarise the gaps briefly, and ask about the most important missing conceptual field first.",
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
  sequencing: {
    title: 'Sequencing',
    intro:
      'Order works on the timeline and set date anchors. The agent stages sortIndex and known dates; commit runs batch recompute for timelineDate and dateDisplay.',
    topics: [
      'Which work needs repositioning',
      'Neighbouring works (before/after)',
      'Confirmed creation dates or circa ranges',
    ],
    buttonLabel: 'Begin sequencing',
    message:
      "I'd like to sequence artworks on the timeline. Please confirm which series we're ordering and ask which work we should place first.",
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
  'event-enrichment': {
    title: 'Event enrichment',
    intro:
      'Two-phase session: Phase A looks up authority URIs (Wikidata, TGN, institutional links). Phase B is a short dialogue to capture how the show came together and where it sits in the practice.',
    topics: [
      'Phase A — confirm venue and external authority links',
      'How the show came about and works were arranged in space',
      'Opening night or reactions worth recording',
      'Where this exhibition sits in the practice arc',
    ],
    buttonLabel: 'Begin event enrichment',
    message:
      "I'd like to enrich this event. Please start Phase A — review the stub record and look up authority URIs for the venue and any external links. Present each finding for me to confirm.",
  },
  'connected-reading': {
    title: 'Connected reading',
    intro:
      'Cross-work reading session — follow a thread across multiple artworks without committing a single primary cataloguing record. Mentions are tracked on the session; abstracts may be proposed for bio/statement.',
    buttonLabel: 'Begin connected reading',
    message:
      "I'd like a connected reading across works. Please ask which thread or pair of works we're following first.",
  },
  'annual-snapshot': {
    title: 'Annual snapshot',
    intro:
      'Year-end practice snapshot — updates to biography/statement layers and high-level framing, not a single artwork catalogue.',
    buttonLabel: 'Begin annual snapshot',
    message:
      "I'd like to do an annual practice snapshot. Please ask what year we're reflecting on and what changed.",
  },
  'corpus-revisit': {
    title: 'Corpus revisit',
    intro:
      'Reopen an earlier session in light of new corpus context. This creates a new Session record linked via revisitOf — it does not overwrite the original transcript.',
    topics: [
      'Which prior session or artwork thread to reopen',
      'What new corpus context changes the earlier reading',
      'Whether this revisit is also a linchpin (structural pattern across works)',
    ],
    buttonLabel: 'Begin corpus revisit',
    message:
      "I'd like to reopen an earlier session with new corpus context. Ask which session or artwork we're revisiting, and what changed since then.",
  },
}

export function getSessionKickoff(
  sessionType: string | null | undefined,
  isRefinement?: boolean,
): SessionKickoff | null {
  if (!sessionType) return null
  if (sessionType === 'artwork-cataloguing' && isRefinement) {
    return KICKOFFS['artwork-cataloguing-refinement'] ?? null
  }
  if (!(sessionType in KICKOFFS)) return null
  return KICKOFFS[sessionType as SessionType | 'artwork-cataloguing-refinement']
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

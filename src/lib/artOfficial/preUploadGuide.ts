/** Pre-upload phase copy — shared by admin UI and agent system prompt (dialogue spec §3). */

export type PreUploadStep = {
  number: number
  title: string
  question: string
  purpose: string
}

export const PRE_UPLOAD_STEPS: PreUploadStep[] = [
  {
    number: 1,
    title: 'Relationship to time',
    question:
      'Before we look at it together — is this a recent work, or something you have been sitting with for a while?',
    purpose:
      'Orients the work in time and in your emotional relationship to it. Short answers are fine; longer ones often reveal where the piece sits in the practice.',
  },
  {
    number: 2,
    title: 'Place in the body of work',
    question:
      'Is this part of something ongoing, or does it feel more like a standalone moment?',
    purpose:
      'Orients the work in your larger arc. The instinctive answer often contains something formal classification would never surface on its own.',
  },
  {
    number: 3,
    title: 'Where you were when you made it',
    question: 'Where were you when you made this one?',
    purpose:
      'Brings you back into the physical and mental space of making — so that by the blind description you are standing in front of the work, not summarising it from a distance.',
  },
  {
    number: 4,
    title: 'Blind description',
    question:
      'Before you upload — describe this work to me first, before either of us sees it. I will ask you again later, once we have talked it through, and we will look at both together at the end. There is no right way to do this — however it comes is exactly right.',
    purpose:
      'Unguarded, pre-conscious material — what you know before the image is in the room. This is stored privately on the session (not published verbatim) and returned at the end next to your second description.',
  },
]

export const PRE_UPLOAD_OVERVIEW = `One question at a time below — answer in the chat when Art/Official asks.`

/** Shown on step 1 only — rationale from art-official-dialogue-spec §3. */
export const PRE_UPLOAD_WHY_PARAGRAPHS = [
  'Most cataloguing starts with the image on screen. This session deliberately starts without it.',
  'You will answer four short questions in chat before you upload — while neither of us has seen the file yet. That is meant to feel like the conversation warming up, not a form: the things you already know but have not packaged into a presentable answer.',
  'The first three questions place the work in time, in your practice, and in the place you were when you made it — so that by the blind description you are standing in front of the work in memory, not summarising it from a distance.',
  'The fourth question asks you to describe the work before upload. That text stays on this session (private), comes back late in the dialogue, and appears at confirmation next to a second description — so you can see what shifted once the image has been in the room.',
]

export function clampPreUploadStep(step: number | null | undefined): number {
  if (step == null || step < 1) return 1
  if (step > 4) return 4
  return step
}

/**
 * Which pre-upload question to show in the guide (1–4).
 * Prefers agent-set session.preUploadStep; falls back to assistant turn count.
 */
export function resolvePreUploadStep(args: {
  preUploadStep?: number | null
  assistantTurns: number
  hasFirstImpression: boolean
  awaitingAssistant: boolean
}): number {
  if (args.hasFirstImpression) return 4
  if (args.preUploadStep != null && args.preUploadStep >= 1) {
    return clampPreUploadStep(args.preUploadStep)
  }
  if (args.assistantTurns === 0) return 1
  return clampPreUploadStep(
    args.awaitingAssistant ? args.assistantTurns + 1 : args.assistantTurns,
  )
}

export const BLIND_DESCRIPTION_TIPS = [
  'Neither you nor the agent has seen the image yet — describe from memory and bodily sense, not from looking at a file.',
  'Raw, associative language is more useful than a polished artist statement.',
  'Length does not matter — a few sentences or several paragraphs are both fine.',
  'You will describe the work again after the image and dialogue; both versions appear side by side at confirmation so you can see what shifted.',
  'This text stays on the session record for your reference; it is not copied to the public artwork record unless you choose to use it elsewhere.',
]

export function buildPreUploadSessionBlock(): string {
  return `PRE-UPLOAD PHASE (artwork-cataloguing only — before primaryImage exists)

Run four questions in this locked order, one per turn. Do not skip, reorder, or combine them. Do not discuss the image, dimensions, medium, or catalogue fields until after the blind description is stored and the artist uploads.

The phase should feel like warming up — not "starting the session" or listing phases aloud.

The server tracks which question is current (PRE-UPLOAD STATUS block below). When the artist has answered, acknowledge briefly and ask the NEXT question only — never repeat a question they already answered. Do not call store_session_field for preUploadStep unless advancing forward; the server also advances automatically when they reply.

Question 1 — relationship to time:
> Before we look at it together — is this a recent work, or something you've been sitting with for a while?

Question 2 — place in the body of work:
> Is this part of something ongoing, or does it feel more like a standalone moment?
(You know the practice from knowledge — ask because the instinctive answer often contains material classification would miss.)

Question 3 — where they were when making:
> Where were you when you made this one?

Question 4 — blind description (use this framing verbatim in substance):
> Before you upload — I'd like you to describe this work to me first, before either of us sees it. I'll ask you again later, once we've talked it through, and we'll look at both together at the end. There's no right way to do this — however it comes is exactly right.

When the artist answers question 4, call store_session_field with field "firstImpression" and value = their full blind description (plain text). Do not paraphrase or edit it.

After store_session_field succeeds: do not send another message before upload. The UI shows the upload control. When they upload, the server switches to the vision phase automatically — share what you see in the image for one or two turns, then factual cataloguing begins.

Rules:
- firstImpression is session-only — never update_field to artworks for the blind description.
- Never write firstImpression to the public Artworks record without explicit artist confirmation.
- Return to the blind description late in the session when drawing encounterNote: "You described it at the start as [x] — is that still how it feels?"
- At confirmation, secondDescription is collected separately; both appear for the artist to compare.`
}

export type PreUploadSessionState = {
  preUploadStep?: number | null
  hasFirstImpression: boolean
  hasPrimaryImage: boolean
}

/** Dynamic block injected each chat turn — tells the agent exactly which question is live. */
export function buildPreUploadStateBlock(state: PreUploadSessionState): string | null {
  if (state.hasPrimaryImage) return null
  if (state.hasFirstImpression) {
    return `PRE-UPLOAD STATUS: Blind description saved. Wait for the artist to upload the primary image — do not repeat pre-upload questions or ask catalogue fields yet beyond upload guidance.`
  }

  const step = clampPreUploadStep(state.preUploadStep ?? 1)
  const current = PRE_UPLOAD_STEPS[step - 1]
  if (!current) return null

  return `PRE-UPLOAD STATUS (authoritative — follow exactly)

Current step: ${step} of 4 — "${current.title}"
Ask ONLY this question next (one short acknowledgement of their last answer if helpful, then the question):
> ${current.question}

Do NOT repeat questions 1–${step - 1 || 0}. Do NOT set preUploadStep to a number lower than ${step}.`
}

export function sessionHasPrimaryImage(session: {
  fieldUpdateTimeline?: unknown
  stagedMedia?: unknown
}): boolean {
  const timeline = session.fieldUpdateTimeline
  if (Array.isArray(timeline)) {
    if (
      timeline.some(
        (e) =>
          e &&
          typeof e === 'object' &&
          (e as { field?: string }).field === 'primaryImage',
      )
    ) {
      return true
    }
  }
  const staged = session.stagedMedia
  if (Array.isArray(staged)) {
    if (
      staged.some(
        (r) =>
          r &&
          typeof r === 'object' &&
          (r as { slotId?: string; kind?: string }).slotId === 'primary' &&
          (r as { kind?: string }).kind !== 'skipped',
      )
    ) {
      return true
    }
  }
  return false
}

/**
 * Advance pre-upload step when the artist answers (not on kickoff or upload messages).
 * Returns the new step, or null if unchanged.
 */
export function nextPreUploadStepAfterAnswer(args: {
  sessionType?: string | null
  preUploadStep?: number | null
  hasFirstImpression: boolean
  hasPrimaryImage: boolean
  userMessage: string
  isKickoffMessage: boolean
}): number | null {
  if (args.sessionType !== 'artwork-cataloguing') return null
  if (args.hasFirstImpression || args.hasPrimaryImage) return null
  if (args.isKickoffMessage) return null

  const msg = args.userMessage.trim().toLowerCase()
  if (msg.includes('uploaded the primary artwork') || msg.includes('uploaded the artwork')) {
    return null
  }

  const current = clampPreUploadStep(args.preUploadStep ?? 1)
  if (current >= 4) return null

  return current + 1
}

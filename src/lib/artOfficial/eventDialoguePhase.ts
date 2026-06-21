export const EVENT_DIALOGUE_PHASES = ['phase-a-research', 'phase-b-reasoning'] as const

export type EventDialoguePhase = (typeof EVENT_DIALOGUE_PHASES)[number]

export const EVENT_DIALOGUE_PHASE_LABELS: Record<EventDialoguePhase, string> = {
  'phase-a-research': 'Research',
  'phase-b-reasoning': 'Reasoning',
}

export function normalizeEventDialoguePhase(value: unknown): EventDialoguePhase {
  return value === 'phase-b-reasoning' ? 'phase-b-reasoning' : 'phase-a-research'
}

export function defaultEventDialoguePhase(): EventDialoguePhase {
  return 'phase-a-research'
}

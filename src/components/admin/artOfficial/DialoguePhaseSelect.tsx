'use client'

import {
  SESSION_PHASE_LABELS,
  SESSION_PHASES,
  type SessionPhase,
} from '@/lib/artOfficial/sessionPhase'

export function DialoguePhaseSelect({
  phase,
  disabled,
  onPhaseChange,
}: {
  phase: SessionPhase
  disabled?: boolean
  onPhaseChange: (phase: SessionPhase) => void
}) {
  return (
    <div className="art-official-chat__phase">
      <label className="art-official-chat__phase-label" htmlFor="dialogue-phase">
        Dialogue phase
      </label>
      <select
        id="dialogue-phase"
        className="art-official-chat__phase-select"
        value={phase}
        disabled={disabled}
        onChange={(e) => onPhaseChange(e.target.value as SessionPhase)}
      >
        {SESSION_PHASES.map((p) => (
          <option key={p} value={p}>
            {SESSION_PHASE_LABELS[p]}
          </option>
        ))}
      </select>
      <span className="art-official-chat__phase-hint">
        Phases advance automatically (vision → cataloguing → intent). Override here if needed.
      </span>
    </div>
  )
}

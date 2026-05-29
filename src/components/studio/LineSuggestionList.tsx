'use client'

import type { FieldNote } from '@/payload-types'

type LineSuggestionListProps = {
  noteId: number
  suggestions: NonNullable<FieldNote['suggestedLines']>
  onUpdated: () => void
}

export function LineSuggestionList({ noteId, suggestions, onUpdated }: LineSuggestionListProps) {
  if (!suggestions?.length) return null

  async function act(lineId: number, action: 'confirm' | 'dismiss') {
    const body =
      action === 'confirm' ? { confirmLineId: lineId } : { dismissLineId: lineId }
    await fetch(`/api/studio/field-notes/${noteId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    onUpdated()
  }

  return (
    <section>
      <h3>Suggested Lines</h3>
      <ul className="studio-suggestion-chips">
        {suggestions.map((s) => (
          <li key={s.lineId}>
            <button type="button" onClick={() => void act(s.lineId, 'confirm')}>
              ✓ {s.lineName ?? `Line #${s.lineId}`}
            </button>
            <button type="button" onClick={() => void act(s.lineId, 'dismiss')}>
              Dismiss
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

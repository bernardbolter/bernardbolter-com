'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'

export type LineOption = { id: number; name: string }

type LinesPickerProps = {
  value: LineOption[]
  onChange: (lines: LineOption[]) => void
  disabled?: boolean
}

export function LinesPicker({ value, onChange, disabled }: LinesPickerProps) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LineOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchLines = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/studio/lines?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) return
      const data = (await res.json()) as { docs?: LineOption[] }
      setResults(data.docs ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void searchLines(query)
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open, query, searchLines])

  function isSelected(id: number) {
    return value.some((line) => line.id === id)
  }

  function toggleLine(line: LineOption) {
    if (isSelected(line.id)) {
      onChange(value.filter((item) => item.id !== line.id))
    } else {
      onChange([...value, line])
    }
  }

  async function createLine(name: string) {
    setCreating(true)
    try {
      const res = await fetch('/api/studio/lines', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) return
      const line = (await res.json()) as LineOption
      if (!isSelected(line.id)) {
        onChange([...value, line])
      }
      setQuery('')
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  const trimmedQuery = query.trim()
  const exactMatch = results.some(
    (line) => line.name.toLowerCase() === trimmedQuery.toLowerCase(),
  )
  const showCreate =
    trimmedQuery.length > 0 && !exactMatch && !creating && !loading

  return (
    <div className="studio-upload__field">
      <label htmlFor={`${listId}-input`}>Lines</label>
      <div className="studio-lines-picker">
        {value.length > 0 ? (
          <ul className="studio-lines-picker__chips" aria-label="Selected lines">
            {value.map((line) => (
              <li key={line.id}>
                <button
                  type="button"
                  className="studio-lines-picker__chip"
                  disabled={disabled}
                  onClick={() => toggleLine(line)}
                >
                  {line.name} ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          id={`${listId}-input`}
          type="search"
          className="studio-lines-picker__input"
          placeholder="Search or create a line…"
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150)
          }}
        />
        {open ? (
          <ul className="studio-lines-picker__menu" role="listbox">
            {loading ? <li className="studio-lines-picker__hint">Searching…</li> : null}
            {results.map((line) => (
              <li key={line.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected(line.id)}
                  disabled={disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleLine(line)}
                >
                  {isSelected(line.id) ? '✓ ' : ''}
                  {line.name}
                </button>
              </li>
            ))}
            {showCreate ? (
              <li>
                <button
                  type="button"
                  className="studio-lines-picker__create"
                  disabled={disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void createLine(trimmedQuery)}
                >
                  + Create Line &lsquo;{trimmedQuery}&rsquo;
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

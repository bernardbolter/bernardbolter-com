'use client'

import { Button, FieldLabel, useField } from '@payloadcms/ui'
import { useEffect, useMemo, useState } from 'react'
import type { TextFieldClientComponent } from 'payload'

import {
  EDITION_VOCABULARY_ADD_NEW_VALUE,
  type EditionVocabularyKind,
  type EditionVocabularyOption,
} from '@/lib/artwork/editionTierVocabulary'

function vocabularyKindFromField(field: { admin?: { custom?: unknown } }): EditionVocabularyKind {
  const custom = field.admin?.custom
  if (
    typeof custom === 'object' &&
    custom !== null &&
    (custom as { editionVocabularyKind?: unknown }).editionVocabularyKind === 'printTechnique'
  ) {
    return 'printTechnique'
  }
  return 'substrate'
}

export const EditionVocabularySelectField: TextFieldClientComponent = ({ field, path }) => {
  const fieldPath = path ?? field.name
  const kind = vocabularyKindFromField(field)
  const { value, setValue } = useField<string>({ path: fieldPath })
  const [options, setOptions] = useState<EditionVocabularyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOptions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/art-official/edition-vocabulary?kind=${kind}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setOptions(data.docs ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOptions()
  }, [kind])

  const current = typeof value === 'string' ? value : ''
  const inList = options.some((option) => option.value === current)
  const placeholder = kind === 'substrate' ? 'Select substrate…' : 'Select print technique…'

  const selectValue = useMemo(() => {
    if (showAddForm) return EDITION_VOCABULARY_ADD_NEW_VALUE
    if (current && !inList) return EDITION_VOCABULARY_ADD_NEW_VALUE
    return current
  }, [current, inList, showAddForm])

  const handleSelectChange = (next: string) => {
    setError(null)
    if (next === EDITION_VOCABULARY_ADD_NEW_VALUE) {
      setShowAddForm(true)
      setNewLabel(current && !inList ? current : '')
      return
    }
    setShowAddForm(false)
    setNewLabel('')
    setValue(next)
  }

  const handleAdd = async () => {
    const label = newLabel.trim()
    if (!label) {
      setError('Enter a label to add.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/art-official/edition-vocabulary', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, label }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not add option.')
        return
      }
      setOptions(data.docs ?? [])
      setValue(typeof data.value === 'string' ? data.value : '')
      setShowAddForm(false)
      setNewLabel('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="field-type select">
      <FieldLabel
        htmlFor={fieldPath}
        label={field.label}
        required={Boolean(field.required)}
      />
      <select
        id={fieldPath}
        name={fieldPath}
        value={selectValue}
        disabled={loading || saving}
        onChange={(event) => handleSelectChange(event.target.value)}
      >
        <option value="">{loading ? 'Loading options…' : placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {!loading && current && !inList && !showAddForm ? (
          <option value={current}>{current} (saved value)</option>
        ) : null}
      </select>

      {showAddForm ? (
        <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
          <input
            type="text"
            value={newLabel}
            placeholder={kind === 'substrate' ? 'e.g. Hahnemühle Photo Rag' : 'e.g. Risograph'}
            onChange={(event) => setNewLabel(event.target.value)}
            disabled={saving}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button buttonStyle="primary" disabled={saving} onClick={() => void handleAdd()}>
              {saving ? 'Adding…' : 'Add to list'}
            </Button>
            <Button
              buttonStyle="secondary"
              disabled={saving}
              onClick={() => {
                setShowAddForm(false)
                setNewLabel('')
                setError(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p style={{ marginTop: '0.5rem', color: 'var(--theme-error-500)' }}>{error}</p>
      ) : null}
    </div>
  )
}

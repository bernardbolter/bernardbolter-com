'use client'

import { FieldLabel, useField } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import type { TextFieldClientComponent } from 'payload'

import type { MediumOption } from '@/lib/artOfficial/artworkMediumOptions'

export const ArtworkMediumSelectField: TextFieldClientComponent = ({ field, path }) => {
  const fieldPath = path ?? field.name
  const { value, setValue } = useField<string>({ path: fieldPath })
  const [options, setOptions] = useState<MediumOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/art-official/medium-options', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setOptions(data.docs ?? [])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const current = typeof value === 'string' ? value : ''
  const inList = options.some((o) => o.value === current)

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
        value={current}
        disabled={loading}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">{loading ? 'Loading media…' : 'Select medium…'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {!loading && current && !inList ? (
          <option value={current}>{current} (saved value)</option>
        ) : null}
      </select>
    </div>
  )
}

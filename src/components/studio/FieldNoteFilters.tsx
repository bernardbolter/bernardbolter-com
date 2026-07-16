'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import {
  fieldNoteConceptualThreads,
  fieldNoteMediaTypes,
  fieldNoteProcessStages,
  fieldNoteRegisters,
} from '@/lib/studio/fieldNoteSchema'

export function FieldNoteFilters() {
  const router = useRouter()
  const params = useSearchParams()

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/studio/notes?${next.toString()}`)
  }

  return (
    <form
      className="studio-filters"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Filter field notes"
    >
      <div className="studio-filters__field">
        <label htmlFor="fn-media">Media type</label>
        <select
          id="fn-media"
          defaultValue={params.get('mediaType') ?? ''}
          onChange={(e) => update('mediaType', e.target.value)}
        >
          <option value="">All</option>
          {fieldNoteMediaTypes.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="studio-filters__field">
        <label htmlFor="fn-city">City</label>
        <input
          id="fn-city"
          defaultValue={params.get('city') ?? ''}
          onBlur={(e) => update('city', e.target.value.trim())}
        />
      </div>
      <div className="studio-filters__field">
        <label htmlFor="fn-register">Register</label>
        <select
          id="fn-register"
          defaultValue={params.get('register') ?? ''}
          onChange={(e) => update('register', e.target.value)}
        >
          <option value="">All</option>
          {fieldNoteRegisters.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="studio-filters__field">
        <label htmlFor="fn-stage">Process stage</label>
        <select
          id="fn-stage"
          defaultValue={params.get('processStage') ?? ''}
          onChange={(e) => update('processStage', e.target.value)}
        >
          <option value="">All</option>
          {fieldNoteProcessStages.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="studio-filters__field">
        <label htmlFor="fn-thread">Conceptual thread</label>
        <select
          id="fn-thread"
          defaultValue={params.get('conceptualThread') ?? ''}
          onChange={(e) => update('conceptualThread', e.target.value)}
        >
          <option value="">All</option>
          {fieldNoteConceptualThreads.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <label className="studio-filters__checkbox">
        <input
          type="checkbox"
          defaultChecked={params.get('untagged') === '1'}
          onChange={(e) => update('untagged', e.target.checked ? '1' : '')}
        />
        Untagged only
      </label>
      <label className="studio-filters__checkbox">
        <input
          type="checkbox"
          defaultChecked={params.get('museumSourced') === '1'}
          onChange={(e) => update('museumSourced', e.target.checked ? '1' : '')}
        />
        Museum sourced
      </label>
    </form>
  )
}

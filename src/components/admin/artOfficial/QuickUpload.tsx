'use client'

import { Button } from '@payloadcms/ui'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  ACH_ROOT_SERIES_SLUG,
  DCS_ROOT_SERIES_SLUG,
} from '@/lib/artOfficial/catalogScope'
import {
  deriveAspectRatio,
  deriveOrientation,
  deriveSizeTier,
  slugifyArtworkTitle,
  type Orientation,
} from '@/lib/artOfficial/quickUploadDerived'
import type { MediumOption } from '@/lib/artOfficial/artworkMediumOptions'
import {
  formatWpImportLabel,
  type WordpressImportEntry,
} from '@/lib/artOfficial/wordpressImport.shared'

import { ImageUpload } from './ImageUpload'
import { MediaThumbnail } from './MediaThumbnail'

import './artOfficialHome.scss'

type SeriesOption = { id: number; name: string; slug: string }

const QUICK_UPLOAD_DRAFT_KEY = 'art-official:quick-upload-draft'

type QuickUploadDraft = {
  title: string
  slug: string
  yearCreated: string
  spansYears: boolean
  yearCompleted: string
  seriesId: string
  medium: string
  mediumOther: string
  width: string
  height: string
  depth: string
  dimensionUnit: 'cm' | 'in'
  availabilityStatus: string
  primaryMediaId: number | null
  dcsStreetId: number | null
  dcsSatelliteId: number | null
  achSourceIds: number[]
  orientationOverride: string
  sizeTierOverride: string
}

function readQuickUploadDraft(): QuickUploadDraft | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(QUICK_UPLOAD_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as QuickUploadDraft
  } catch {
    return null
  }
}

const AVAILABILITY_OPTIONS = [
  { label: 'Not for sale', value: 'not-for-sale' },
  { label: 'Available', value: 'available' },
  { label: 'Sold', value: 'sold' },
  { label: 'On loan', value: 'on-loan' },
] as const

function UploadWithThumbnail({
  mediaId,
  disabled,
  accept,
  altLabel,
  onUploaded,
}: {
  mediaId: number | null
  disabled?: boolean
  accept?: string
  altLabel?: string
  onUploaded: (id: number) => void
}) {
  return (
    <div className="art-official-upload__file-row">
      {mediaId ? <MediaThumbnail mediaId={mediaId} /> : null}
      <div className="art-official-upload__file-input">
        <ImageUpload
          disabled={disabled}
          accept={accept}
          altLabel={altLabel}
          onUploaded={onUploaded}
        />
        {mediaId ? (
          <span className="art-official-upload__hint">Attached · media #{mediaId}</span>
        ) : null}
      </div>
    </div>
  )
}

function MultiImageUpload({
  label,
  mediaIds,
  onAdd,
  onRemove,
  disabled,
}: {
  label: string
  mediaIds: number[]
  onAdd: (id: number) => void
  onRemove: (id: number) => void
  disabled?: boolean
}) {
  return (
    <div className="art-official-upload__multi">
      <p className="art-official-upload__multi-label">{label}</p>
      {mediaIds.length > 0 ? (
        <ul className="art-official-upload__attached-list">
          {mediaIds.map((id) => (
            <li key={id} className="art-official-upload__attached-item">
              <MediaThumbnail mediaId={id} />
              <span className="art-official-upload__attached-meta">#{id}</span>
              <button
                type="button"
                className="art-official-upload__attached-remove"
                disabled={disabled}
                onClick={() => onRemove(id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ImageUpload
        disabled={disabled}
        accept="image/jpeg,image/png,image/tiff,image/webp"
        altLabel={label}
        onUploaded={onAdd}
      />
    </div>
  )
}

export function QuickUpload() {
  const [seriesList, setSeriesList] = useState<SeriesOption[]>([])
  const [wpEntries, setWpEntries] = useState<WordpressImportEntry[]>([])
  const [useWp, setUseWp] = useState(false)
  const [wpPick, setWpPick] = useState('')
  const [wpFilter, setWpFilter] = useState('')
  const [wpLoading, setWpLoading] = useState(false)
  const [wpLoadError, setWpLoadError] = useState<string | null>(null)
  const [wpLoadedLabel, setWpLoadedLabel] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [yearCreated, setYearCreated] = useState('')
  const [spansYears, setSpansYears] = useState(false)
  const [yearCompleted, setYearCompleted] = useState('')
  const [seriesId, setSeriesId] = useState('')
  const [seriesLoadError, setSeriesLoadError] = useState<string | null>(null)
  const [seriesLoading, setSeriesLoading] = useState(true)
  const [showNewSeries, setShowNewSeries] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState('')
  const [newSeriesSlug, setNewSeriesSlug] = useState('')
  const [creatingSeries, setCreatingSeries] = useState(false)
  const [mediumOptions, setMediumOptions] = useState<MediumOption[]>([])
  const [medium, setMedium] = useState('')
  const [mediumOther, setMediumOther] = useState('')
  const [addingMedium, setAddingMedium] = useState(false)
  const [mediumFeedback, setMediumFeedback] = useState<string | null>(null)
  const [mediumFeedbackError, setMediumFeedbackError] = useState(false)
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [depth, setDepth] = useState('')
  const [dimensionUnit, setDimensionUnit] = useState<'cm' | 'in'>('cm')
  const [availabilityStatus, setAvailabilityStatus] = useState('not-for-sale')
  const [primaryMediaId, setPrimaryMediaId] = useState<number | null>(null)
  const [dcsStreetId, setDcsStreetId] = useState<number | null>(null)
  const [dcsSatelliteId, setDcsSatelliteId] = useState<number | null>(null)
  const [achSourceIds, setAchSourceIds] = useState<number[]>([])

  const [orientationOverride, setOrientationOverride] = useState<Orientation | ''>('')
  const [sizeTierOverride, setSizeTierOverride] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ adminUrl: string; title: string } | null>(null)

  const selectedSeries = seriesList.find((s) => String(s.id) === seriesId)
  const isDcs = selectedSeries?.slug === DCS_ROOT_SERIES_SLUG
  const isAch = selectedSeries?.slug === ACH_ROOT_SERIES_SLUG

  const loadSeries = useCallback(async () => {
    setSeriesLoading(true)
    setSeriesLoadError(null)
    try {
      const res = await fetch('/api/series', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Could not load series list',
        )
      }
      const docs = (data.docs ?? []) as Array<{ id: number; name?: string; slug: string }>
      setSeriesList(
        docs
          .filter((s) => s.id && s.slug)
          .map((s) => ({
            id: s.id,
            name: (s.name ?? s.slug).trim() || s.slug,
            slug: s.slug,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
    } catch (e) {
      setSeriesLoadError(e instanceof Error ? e.message : 'Could not load series list')
      setSeriesList([])
    } finally {
      setSeriesLoading(false)
    }
  }, [])

  const loadMediumOptions = useCallback(async () => {
    const res = await fetch('/api/art-official/medium-options', {
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      setMediumOptions(data.docs ?? [])
    }
  }, [])

  useEffect(() => {
    void loadSeries()
  }, [loadSeries])

  useEffect(() => {
    void loadMediumOptions()
  }, [loadMediumOptions])

  useEffect(() => {
    const draft = readQuickUploadDraft()
    if (!draft) return
    setTitle(draft.title)
    const restoredSlug =
      typeof draft.slug === 'string' && draft.slug.trim() ?
        draft.slug.trim()
      : slugifyArtworkTitle(draft.title)
    setSlug(restoredSlug)
    setSlugTouched(
      Boolean(draft.slug?.trim()) &&
        restoredSlug !== slugifyArtworkTitle(draft.title),
    )
    setYearCreated(draft.yearCreated)
    setSpansYears(draft.spansYears)
    setYearCompleted(draft.yearCompleted)
    setSeriesId(draft.seriesId)
    setMedium(draft.medium)
    setMediumOther(draft.mediumOther)
    setWidth(draft.width)
    setHeight(draft.height)
    setDepth(draft.depth)
    setDimensionUnit(draft.dimensionUnit)
    setAvailabilityStatus(draft.availabilityStatus)
    setPrimaryMediaId(draft.primaryMediaId)
    setDcsStreetId(draft.dcsStreetId)
    setDcsSatelliteId(draft.dcsSatelliteId)
    setAchSourceIds(draft.achSourceIds ?? [])
    setOrientationOverride((draft.orientationOverride as Orientation | '') || '')
    setSizeTierOverride(draft.sizeTierOverride)
  }, [])

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return
    const draft: QuickUploadDraft = {
      title,
      slug,
      yearCreated,
      spansYears,
      yearCompleted,
      seriesId,
      medium,
      mediumOther,
      width,
      height,
      depth,
      dimensionUnit,
      availabilityStatus,
      primaryMediaId,
      dcsStreetId,
      dcsSatelliteId,
      achSourceIds,
      orientationOverride,
      sizeTierOverride,
    }
    const id = window.setTimeout(() => {
      sessionStorage.setItem(QUICK_UPLOAD_DRAFT_KEY, JSON.stringify(draft))
    }, 400)
    return () => window.clearTimeout(id)
  }, [
    title,
    slug,
    yearCreated,
    spansYears,
    yearCompleted,
    seriesId,
    medium,
    mediumOther,
    width,
    height,
    depth,
    dimensionUnit,
    availabilityStatus,
    primaryMediaId,
    dcsStreetId,
    dcsSatelliteId,
    achSourceIds,
    orientationOverride,
    sizeTierOverride,
  ])

  async function addCustomMediumToList() {
    const label = mediumOther.trim()
    if (!label) return
    setAddingMedium(true)
    setMediumFeedback(null)
    setMediumFeedbackError(false)
    try {
      const res = await fetch('/api/art-official/medium-options', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Could not add medium')
      }
      setMediumOptions(data.docs ?? [])
      setMedium(typeof data.value === 'string' ? data.value : '')
      setMediumOther('')
      setMediumFeedback(
        data.created === false
          ? `“${data.label ?? label}” is already in the list — selected for you.`
          : `Added “${data.label ?? label}” to the medium list.`,
      )
    } catch (err) {
      setMediumFeedback(err instanceof Error ? err.message : 'Could not add medium')
      setMediumFeedbackError(true)
    } finally {
      setAddingMedium(false)
    }
  }

  async function createSeries() {
    const name = newSeriesName.trim()
    if (!name) return
    setCreatingSeries(true)
    setSeriesLoadError(null)
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: newSeriesSlug.trim() || slugifyArtworkTitle(name),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Could not create series',
        )
      }
      const created = data as { id: number; name: string; slug: string }
      await loadSeries()
      setSeriesId(String(created.id))
      setShowNewSeries(false)
      setNewSeriesName('')
      setNewSeriesSlug('')
    } catch (e) {
      setSeriesLoadError(e instanceof Error ? e.message : 'Could not create series')
    } finally {
      setCreatingSeries(false)
    }
  }

  useEffect(() => {
    if (!useWp) return
    setWpLoading(true)
    setWpLoadError(null)
    void (async () => {
      try {
        const res = await fetch('/api/art-official/wordpress-import')
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(
            typeof data.error === 'string' ? data.error : 'Could not load legacy export',
          )
        }
        setWpEntries(data.docs ?? [])
      } catch (e) {
        setWpLoadError(e instanceof Error ? e.message : 'Could not load legacy export')
        setWpEntries([])
      } finally {
        setWpLoading(false)
      }
    })()
  }, [useWp])

  const filteredWpEntries = useMemo(() => {
    const q = wpFilter.trim().toLowerCase()
    if (!q) return wpEntries
    return wpEntries.filter((row) => {
      const haystack = [
        row.title,
        row.year != null ? String(row.year) : '',
        row.seriesName ?? '',
        row.seriesSlug ?? '',
        row.wpSlug ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [wpEntries, wpFilter])

  const applyWpEntry = useCallback(
    (entry: WordpressImportEntry) => {
      setTitle(entry.title)
      setSlugTouched(false)
      setSlug(entry.wpSlug?.trim() || slugifyArtworkTitle(entry.title))
      setYearCreated(entry.year != null ? String(entry.year) : '')
      setMedium(entry.medium ?? '')
      setWidth(entry.widthCm != null ? String(entry.widthCm) : '')
      setHeight(entry.heightCm != null ? String(entry.heightCm) : '')
      setDepth('')
      setDimensionUnit('cm')
      setSpansYears(false)
      setYearCompleted('')
      if (entry.availabilityStatus) {
        setAvailabilityStatus(entry.availabilityStatus)
      }
      setOrientationOverride(entry.orientation ?? '')
      setSizeTierOverride(entry.sizeTier ?? '')
      if (entry.seriesSlug) {
        const match = seriesList.find((s) => s.slug === entry.seriesSlug)
        if (match) setSeriesId(String(match.id))
      }
      setPrimaryMediaId(null)
      setDcsStreetId(null)
      setDcsSatelliteId(null)
      setAchSourceIds([])
      setWpLoadedLabel(formatWpImportLabel(entry))
      setError(null)
    },
    [seriesList],
  )

  function onWpSelect(id: string) {
    setWpPick(id)
    if (!id) {
      setWpLoadedLabel(null)
      return
    }
    const entry = wpEntries.find((e) => String(e.id) === id)
    if (entry) applyWpEntry(entry)
  }

  useEffect(() => {
    if (!wpPick || seriesId || !seriesList.length) return
    const entry = wpEntries.find((e) => String(e.id) === wpPick)
    if (!entry?.seriesSlug) return
    const match = seriesList.find((s) => s.slug === entry.seriesSlug)
    if (match) setSeriesId(String(match.id))
  }, [wpPick, seriesId, seriesList, wpEntries])

  const widthNum = parseFloat(width)
  const heightNum = parseFloat(height)
  const depthNum = depth ? parseFloat(depth) : undefined

  const derived = useMemo(() => {
    if (!Number.isFinite(widthNum) || !Number.isFinite(heightNum) || widthNum <= 0 || heightNum <= 0) {
      return null
    }
    const orientation = deriveOrientation(widthNum, heightNum)
    const sizeTier = deriveSizeTier({
      widthWhole: widthNum,
      heightWhole: heightNum,
      depthWhole: depthNum,
      dimensionUnit,
    })
    const aspectRatio = deriveAspectRatio(widthNum, heightNum, dimensionUnit)
    return { orientation, sizeTier, aspectRatio }
  }, [widthNum, heightNum, depthNum, dimensionUnit])

  const orientation =
    orientationOverride || derived?.orientation || 'landscape'
  const sizeTier = sizeTierOverride || derived?.sizeTier || 'md'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!primaryMediaId) {
      setError('Primary image is required.')
      return
    }
    const slugValue = slug.trim() || slugifyArtworkTitle(title.trim())
    if (!title.trim() || !slugValue || !yearCreated || !seriesId || !medium) {
      setError('Fill in all required fields.')
      return
    }
    if (medium === 'other') {
      setError('Click “Add to list” for the new medium before submitting.')
      return
    }
    if (!Number.isFinite(widthNum) || !Number.isFinite(heightNum)) {
      setError('Width and height are required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/art-official/quick-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slugValue,
          yearCreated: Number(yearCreated),
          yearCompleted: spansYears && yearCompleted ? Number(yearCompleted) : undefined,
          seriesId: Number(seriesId),
          medium,
          mediumOther: medium === 'other' ? mediumOther.trim() : undefined,
          widthWhole: widthNum,
          heightWhole: heightNum,
          depthWhole: depthNum,
          dimensionUnit,
          orientation,
          sizeTier,
          availabilityStatus,
          primaryImageMediaId: primaryMediaId,
          dcsStreetMediaId: isDcs ? dcsStreetId ?? undefined : undefined,
          dcsSatelliteMediaId: isDcs ? dcsSatelliteId ?? undefined : undefined,
          achSourceMediaIds: isAch && achSourceIds.length ? achSourceIds : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Submit failed')
      }
      setSuccess({
        adminUrl: data.adminUrl,
        title: data.title ?? title,
      })
      sessionStorage.removeItem(QUICK_UPLOAD_DRAFT_KEY)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  function onTitleChange(next: string) {
    setTitle(next)
    if (!slugTouched) {
      setSlug(slugifyArtworkTitle(next))
    }
  }

  function onSlugChange(next: string) {
    setSlugTouched(true)
    setSlug(next)
  }

  function resetSlugFromTitle() {
    setSlugTouched(false)
    setSlug(slugifyArtworkTitle(title))
  }

  function addAnother() {
    setTitle('')
    setSlug('')
    setSlugTouched(false)
    setYearCreated('')
    setSpansYears(false)
    setYearCompleted('')
    setMedium('')
    setMediumOther('')
    setWidth('')
    setHeight('')
    setDepth('')
    setPrimaryMediaId(null)
    setDcsStreetId(null)
    setDcsSatelliteId(null)
    setAchSourceIds([])
    setOrientationOverride('')
    setSizeTierOverride('')
    setWpPick('')
    setWpFilter('')
    setWpLoadedLabel(null)
    setError(null)
    setSuccess(null)
    sessionStorage.removeItem(QUICK_UPLOAD_DRAFT_KEY)
  }

  return (
    <section className="art-official-upload">
      <p className="art-official-upload__intro">
        Fast intake with no AI. Creates a published artwork with reasoning status{' '}
        <strong>stub</strong> — deepen it later from the Unreasoned Queue. Fields autosave in
        this browser tab if the dev server reloads.
      </p>

      <label className="art-official-upload__wp-toggle">
        <input
          type="checkbox"
          checked={useWp}
          onChange={(e) => {
            const on = e.target.checked
            setUseWp(on)
            if (!on) {
              setWpPick('')
              setWpFilter('')
              setWpLoadedLabel(null)
              setWpLoadError(null)
            }
          }}
        />
        Pre-populate text fields from WordPress export
      </label>

      {useWp ? (
        <fieldset className="art-official-upload__legacy">
          <legend>Legacy WordPress export</legend>
          <p className="art-official-upload__legacy-hint">
            Loads text fields from <code>data/legacy/wp-artworks.json</code>. You still
            upload a new primary image (and any series media) below — old image URLs are
            not imported.
          </p>
          {wpLoading ? (
            <p className="art-official-upload__hint">Loading legacy list…</p>
          ) : null}
          {wpLoadError ? (
            <p className="art-official-home__error">{wpLoadError}</p>
          ) : null}
          {!wpLoading && !wpLoadError && wpEntries.length > 0 ? (
            <>
              <p className="art-official-upload__hint">
                {wpEntries.length} works in export
                {filteredWpEntries.length !== wpEntries.length
                  ? ` · ${filteredWpEntries.length} shown`
                  : ''}
              </p>
              <label className="art-official-upload__field">
                Filter
                <input
                  type="search"
                  placeholder="Title, year, series, slug…"
                  value={wpFilter}
                  onChange={(e) => setWpFilter(e.target.value)}
                />
              </label>
              <label className="art-official-upload__field">
                Select artwork
                <select
                  className="art-official-upload__wp-select"
                  value={wpPick}
                  onChange={(e) => onWpSelect(e.target.value)}
                >
                  <option value="">Choose a work…</option>
                  {filteredWpEntries.map((row) => (
                    <option key={row.id} value={String(row.id)}>
                      {formatWpImportLabel(row)}
                    </option>
                  ))}
                </select>
              </label>
              {wpLoadedLabel ? (
                <p className="art-official-upload__legacy-loaded">
                  Loaded: <strong>{wpLoadedLabel}</strong> — review fields, then add your
                  photos.
                </p>
              ) : null}
            </>
          ) : null}
        </fieldset>
      ) : null}

      {success ? (
        <div className="art-official-upload__success" role="status">
          <p>
            Saved <strong>{success.title}</strong>.{' '}
            <Link href={success.adminUrl}>Open in admin</Link>
          </p>
          <Button buttonStyle="secondary" onClick={addAnother}>
            Add another
          </Button>
        </div>
      ) : null}

      <form className="art-official-upload__form" onSubmit={handleSubmit}>
        <label className="art-official-upload__field">
          Primary image (required)
          <UploadWithThumbnail
            mediaId={primaryMediaId}
            disabled={submitting}
            accept="image/jpeg,image/png,image/tiff,image/webp"
            onUploaded={setPrimaryMediaId}
          />
        </label>

        <label className="art-official-upload__field">
          Title
          <input
            required
            value={title}
            disabled={submitting}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </label>

        <label className="art-official-upload__field">
          Slug (URL)
          <input
            required
            value={slug}
            disabled={submitting}
            placeholder="auto-from-title"
            onChange={(e) => onSlugChange(e.target.value)}
          />
          <p className="art-official-upload__hint">
            Filled from the title as you type; change it when the public URL should differ.{' '}
            {slugTouched && title.trim() ? (
              <button
                type="button"
                className="art-official-upload__inline-btn"
                disabled={submitting}
                onClick={resetSlugFromTitle}
              >
                Reset from title
              </button>
            ) : null}
          </p>
        </label>

        <label className="art-official-upload__field">
          Year created
          <input
            required
            type="number"
            min={1000}
            max={9999}
            value={yearCreated}
            onChange={(e) => setYearCreated(e.target.value)}
          />
        </label>

        <label className="art-official-upload__checkbox">
          <input
            type="checkbox"
            checked={spansYears}
            onChange={(e) => setSpansYears(e.target.checked)}
          />
          Work spans multiple years
        </label>

        {spansYears ? (
          <label className="art-official-upload__field">
            Year completed
            <input
              type="number"
              min={1000}
              max={9999}
              value={yearCompleted}
              onChange={(e) => setYearCompleted(e.target.value)}
            />
          </label>
        ) : null}

        <div className="art-official-upload__field">
          <label htmlFor="quick-upload-series">Series</label>
          {seriesLoading ? (
            <p className="art-official-upload__hint">Loading series…</p>
          ) : null}
          {seriesLoadError ? (
            <p className="art-official-home__error">{seriesLoadError}</p>
          ) : null}
          <select
            id="quick-upload-series"
            required
            value={seriesId}
            disabled={seriesLoading || !seriesList.length}
            onChange={(e) => setSeriesId(e.target.value)}
          >
            <option value="">
              {seriesList.length ? 'Select series…' : 'No series — add one below'}
            </option>
            {seriesList.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="art-official-upload__inline-btn"
            onClick={() => setShowNewSeries((v) => !v)}
          >
            {showNewSeries ? 'Cancel new series' : '+ Add new series'}
          </button>
          {showNewSeries ? (
            <div className="art-official-upload__inline-form">
              <label>
                Series name
                <input
                  value={newSeriesName}
                  onChange={(e) => {
                    setNewSeriesName(e.target.value)
                    if (!newSeriesSlug || newSeriesSlug === slugifyArtworkTitle(newSeriesName)) {
                      setNewSeriesSlug(slugifyArtworkTitle(e.target.value))
                    }
                  }}
                />
              </label>
              <label>
                Slug
                <input
                  value={newSeriesSlug}
                  onChange={(e) => setNewSeriesSlug(e.target.value)}
                />
              </label>
              <Button
                buttonStyle="secondary"
                disabled={creatingSeries || !newSeriesName.trim()}
                onClick={() => void createSeries()}
              >
                {creatingSeries ? 'Creating…' : 'Create & select'}
              </Button>
            </div>
          ) : null}
        </div>

        {isDcs ? (
          <fieldset className="art-official-upload__series-media">
            <legend>Digital City Series — composition layers</legend>
            <label className="art-official-upload__field">
              Street photo (Micro)
              <UploadWithThumbnail
                mediaId={dcsStreetId}
                disabled={submitting}
                onUploaded={setDcsStreetId}
              />
            </label>
            <label className="art-official-upload__field">
              Satellite / aerial image (Macro)
              <UploadWithThumbnail
                mediaId={dcsSatelliteId}
                disabled={submitting}
                onUploaded={setDcsSatelliteId}
              />
            </label>
          </fieldset>
        ) : null}

        {isAch ? (
          <fieldset className="art-official-upload__series-media">
            <legend>A Colorful History — source photographs</legend>
            <MultiImageUpload
              label="Original photograph(s)"
              mediaIds={achSourceIds}
              disabled={submitting}
              onAdd={(id) => setAchSourceIds((prev) => [...prev, id])}
              onRemove={(id) =>
                setAchSourceIds((prev) => prev.filter((x) => x !== id))
              }
            />
          </fieldset>
        ) : null}

        <div className="art-official-upload__field">
          <label htmlFor="quick-upload-medium">Medium</label>
          <select
            id="quick-upload-medium"
            required
            value={medium}
            onChange={(e) => {
              setMedium(e.target.value)
              if (e.target.value !== 'other') setMediumOther('')
            }}
          >
            <option value="">Select medium…</option>
            {mediumOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {medium === 'other' ? (
            <div className="art-official-upload__medium-row">
              <label className="art-official-upload__medium-other">
                New medium
                <input
                  value={mediumOther}
                  placeholder="e.g. oil and acrylic on linen"
                  disabled={submitting || addingMedium}
                  onChange={(e) => {
                    setMediumOther(e.target.value)
                    setMediumFeedback(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void addCustomMediumToList()
                    }
                  }}
                />
              </label>
              <Button
                type="button"
                buttonStyle="secondary"
                disabled={submitting || addingMedium || !mediumOther.trim()}
                onClick={() => void addCustomMediumToList()}
              >
                {addingMedium ? 'Adding…' : 'Add to list'}
              </Button>
            </div>
          ) : null}
          {mediumFeedback ? (
            <p
              className={`art-official-upload__medium-msg${mediumFeedbackError ? ' art-official-upload__medium-msg--err' : ''}`}
            >
              {mediumFeedback}
            </p>
          ) : null}
          <p className="art-official-upload__hint">
            Pick an existing medium, or choose <strong>Other (add new…)</strong>, type the
            label, and click <strong>Add to list</strong> — no need to submit the whole form.
            It then appears in this dropdown and in Artworks admin.
          </p>
        </div>

        <div className="art-official-upload__dims">
          <label>
            Width
            <input
              required
              type="number"
              min={0}
              step="any"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </label>
          <label>
            Height
            <input
              required
              type="number"
              min={0}
              step="any"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </label>
          <label>
            Depth (optional)
            <input
              type="number"
              min={0}
              step="any"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
            />
          </label>
          <label>
            Unit
            <select
              value={dimensionUnit}
              onChange={(e) => setDimensionUnit(e.target.value as 'cm' | 'in')}
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </label>
        </div>

        {derived ? (
          <div className="art-official-upload__derived">
            <p>
              This work will display as:{' '}
              <strong>
                {orientation} · {sizeTier}
              </strong>
              {derived.aspectRatio != null ? (
                <span> · aspect {derived.aspectRatio}</span>
              ) : null}
            </p>
            <label>
              Orientation override
              <select
                value={orientationOverride}
                onChange={(e) =>
                  setOrientationOverride(e.target.value as Orientation | '')
                }
              >
                <option value="">Use derived ({derived.orientation})</option>
                <option value="landscape">landscape</option>
                <option value="portrait">portrait</option>
                <option value="square">square</option>
              </select>
            </label>
            <label>
              Size tier override
              <select
                value={sizeTierOverride}
                onChange={(e) => setSizeTierOverride(e.target.value)}
              >
                <option value="">Use derived ({derived.sizeTier ?? '—'})</option>
                <option value="xs">xs</option>
                <option value="sm">sm</option>
                <option value="md">md</option>
                <option value="lg">lg</option>
                <option value="xl">xl</option>
              </select>
            </label>
          </div>
        ) : null}

        <label className="art-official-upload__field">
          Availability
          <select
            value={availabilityStatus}
            onChange={(e) => setAvailabilityStatus(e.target.value)}
          >
            {AVAILABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="art-official-home__error">{error}</p> : null}

        <Button buttonStyle="primary" disabled={submitting} type="submit">
          {submitting ? 'Saving…' : 'Create artwork'}
        </Button>
      </form>
    </section>
  )
}

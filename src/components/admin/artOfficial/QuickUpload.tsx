'use client'

import { Button } from '@payloadcms/ui'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  ACH_ROOT_SERIES_SLUG,
  DCS_ROOT_SERIES_SLUG,
  GATES_OF_PERCEPTION_SERIES_SLUG,
  isAchSeriesSlug,
  isMegacitiesSeriesSlug,
} from '@/lib/artOfficial/catalogScope'
import {
  isValidDimensionFraction,
  resolvePhysicalDimension,
} from '@/lib/artOfficial/physicalDimensions'
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
import { matchWpImportEntryByFilename } from '@/lib/artOfficial/wpFieldParsers'
import type { MegacitiesSeriesType } from '@/lib/artOfficial/wpFieldParsers'

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
  widthFraction: string
  heightFraction: string
  depthFraction: string
  dimensionUnit: 'cm' | 'in'
  availabilityStatus: string
  primaryMediaId: number | null
  dcsStreetId: number | null
  dcsSatelliteId: number | null
  achSourceIds: number[]
  orientationOverride: string
  sizeTierOverride: string
  wpId: number | null
  city: string
  country: string
  streetPhotoCaption: string
  cityPopulation: number | null
  cityAreaKm2: number | null
  cityPopulationDensity: number | null
  cityElevationM: number | null
  locationCreatedLabel: string
  achMapLat: number | null
  achMapLng: number | null
  achMapPresence: boolean
  provenanceNotesPlain: string
  sourceImageUrls: string[]
  storyEn: string
  gatesOfPerception: boolean
  megacitiesSeriesType: MegacitiesSeriesType | ''
  megacitiesStyleLabel: string
  megacitiesCoverageArea: string
  megacitiesReferenceCollageId: number | null
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
  onUploaded: (id: number, meta?: { filename: string }) => void
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
  const [widthFraction, setWidthFraction] = useState('')
  const [heightFraction, setHeightFraction] = useState('')
  const [depthFraction, setDepthFraction] = useState('')
  const [dimensionUnit, setDimensionUnit] = useState<'cm' | 'in'>('cm')
  const [availabilityStatus, setAvailabilityStatus] = useState('not-for-sale')
  const [primaryMediaId, setPrimaryMediaId] = useState<number | null>(null)
  const [dcsStreetId, setDcsStreetId] = useState<number | null>(null)
  const [dcsSatelliteId, setDcsSatelliteId] = useState<number | null>(null)
  const [achSourceIds, setAchSourceIds] = useState<number[]>([])
  const [wpId, setWpId] = useState<number | null>(null)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [streetPhotoCaption, setStreetPhotoCaption] = useState('')
  const [cityPopulation, setCityPopulation] = useState<number | null>(null)
  const [cityAreaKm2, setCityAreaKm2] = useState<number | null>(null)
  const [cityPopulationDensity, setCityPopulationDensity] = useState<number | null>(null)
  const [cityElevationM, setCityElevationM] = useState<number | null>(null)
  const [locationCreatedLabel, setLocationCreatedLabel] = useState('')
  const [achMapLat, setAchMapLat] = useState<number | null>(null)
  const [achMapLng, setAchMapLng] = useState<number | null>(null)
  const [achMapPresence, setAchMapPresence] = useState(false)
  const [provenanceNotesPlain, setProvenanceNotesPlain] = useState('')
  const [sourceImageUrls, setSourceImageUrls] = useState<string[]>([])
  const [storyEn, setStoryEn] = useState('')
  const [gatesOfPerception, setGatesOfPerception] = useState(false)
  const [megacitiesSeriesType, setMegacitiesSeriesType] = useState<MegacitiesSeriesType | ''>('')
  const [megacitiesStyleLabel, setMegacitiesStyleLabel] = useState('')
  const [megacitiesCoverageArea, setMegacitiesCoverageArea] = useState('')
  const [megacitiesReferenceCollageId, setMegacitiesReferenceCollageId] = useState<number | null>(
    null,
  )
  const [wpRefImageUrl, setWpRefImageUrl] = useState<string | null>(null)
  const [wpAutoMatched, setWpAutoMatched] = useState(false)

  const [orientationOverride, setOrientationOverride] = useState<Orientation | ''>('')
  const [sizeTierOverride, setSizeTierOverride] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ adminUrl: string; title: string } | null>(null)

  const selectedSeries = seriesList.find((s) => String(s.id) === seriesId)
  const isDcs = selectedSeries?.slug === DCS_ROOT_SERIES_SLUG
  const isAch = isAchSeriesSlug(selectedSeries?.slug)
  const isMegacities = isMegacitiesSeriesSlug(selectedSeries?.slug)
  const gatesSeries = seriesList.find((s) => s.slug === GATES_OF_PERCEPTION_SERIES_SLUG)

  const loadSeries = useCallback(async () => {
    setSeriesLoading(true)
    setSeriesLoadError(null)
    try {
      const res = await fetch('/api/art-official/series', { credentials: 'include' })
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
    setWidthFraction(draft.widthFraction ?? '')
    setHeightFraction(draft.heightFraction ?? '')
    setDepthFraction(draft.depthFraction ?? '')
    setDimensionUnit(draft.dimensionUnit)
    setAvailabilityStatus(draft.availabilityStatus)
    setPrimaryMediaId(draft.primaryMediaId)
    setDcsStreetId(draft.dcsStreetId)
    setDcsSatelliteId(draft.dcsSatelliteId)
    setAchSourceIds(draft.achSourceIds ?? [])
    setOrientationOverride((draft.orientationOverride as Orientation | '') || '')
    setSizeTierOverride(draft.sizeTierOverride)
    setWpId(draft.wpId ?? null)
    setCity(draft.city ?? '')
    setCountry(draft.country ?? '')
    setStreetPhotoCaption(draft.streetPhotoCaption ?? '')
    setCityPopulation(draft.cityPopulation ?? null)
    setCityAreaKm2(draft.cityAreaKm2 ?? null)
    setCityPopulationDensity(draft.cityPopulationDensity ?? null)
    setCityElevationM(draft.cityElevationM ?? null)
    setLocationCreatedLabel(draft.locationCreatedLabel ?? '')
    setAchMapLat(draft.achMapLat ?? null)
    setAchMapLng(draft.achMapLng ?? null)
    setAchMapPresence(draft.achMapPresence ?? false)
    setProvenanceNotesPlain(draft.provenanceNotesPlain ?? '')
    setSourceImageUrls(draft.sourceImageUrls ?? [])
    setStoryEn(draft.storyEn ?? '')
    setGatesOfPerception(draft.gatesOfPerception ?? false)
    setMegacitiesSeriesType(draft.megacitiesSeriesType ?? '')
    setMegacitiesStyleLabel(draft.megacitiesStyleLabel ?? '')
    setMegacitiesCoverageArea(draft.megacitiesCoverageArea ?? '')
    setMegacitiesReferenceCollageId(draft.megacitiesReferenceCollageId ?? null)
  }, [])

  useEffect(() => {
    if (selectedSeries?.slug === GATES_OF_PERCEPTION_SERIES_SLUG) {
      setGatesOfPerception(true)
    }
  }, [selectedSeries?.slug])

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
      widthFraction,
      heightFraction,
      depthFraction,
      dimensionUnit,
      availabilityStatus,
      primaryMediaId,
      dcsStreetId,
      dcsSatelliteId,
      achSourceIds,
      orientationOverride,
      sizeTierOverride,
      wpId,
      city,
      country,
      streetPhotoCaption,
      cityPopulation,
      cityAreaKm2,
      cityPopulationDensity,
      cityElevationM,
      locationCreatedLabel,
      achMapLat,
      achMapLng,
      achMapPresence,
      provenanceNotesPlain,
      sourceImageUrls,
      storyEn,
      gatesOfPerception,
      megacitiesSeriesType,
      megacitiesStyleLabel,
      megacitiesCoverageArea,
      megacitiesReferenceCollageId,
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
    widthFraction,
    heightFraction,
    depthFraction,
    dimensionUnit,
    availabilityStatus,
    primaryMediaId,
    dcsStreetId,
    dcsSatelliteId,
    achSourceIds,
    orientationOverride,
    sizeTierOverride,
    wpId,
    city,
    country,
    streetPhotoCaption,
    cityPopulation,
    cityAreaKm2,
    cityPopulationDensity,
    cityElevationM,
    locationCreatedLabel,
    achMapLat,
    achMapLng,
    achMapPresence,
    provenanceNotesPlain,
    sourceImageUrls,
    storyEn,
    gatesOfPerception,
    megacitiesSeriesType,
    megacitiesStyleLabel,
    megacitiesCoverageArea,
    megacitiesReferenceCollageId,
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
      const res = await fetch('/api/art-official/series', {
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
    if (!useWp && !isDcs && !isAch && !isMegacities) return
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
  }, [useWp, isDcs, isAch, isMegacities])

  const filteredWpEntries = useMemo(() => {
    const seriesSlug = selectedSeries?.slug
    let rows = seriesSlug
      ? wpEntries.filter((row) => {
          if (row.seriesSlug === seriesSlug) return true
          if (
            row.seriesSlug === ACH_ROOT_SERIES_SLUG &&
            isAchSeriesSlug(seriesSlug)
          ) {
            return true
          }
          return false
        })
      : wpEntries
    const q = wpFilter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const haystack = [
        row.title,
        row.year != null ? String(row.year) : '',
        row.seriesName ?? '',
        row.seriesSlug ?? '',
        row.wpSlug ?? '',
        row.city ?? '',
        row.country ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [wpEntries, wpFilter, selectedSeries?.slug])

  const applyWpEntry = useCallback(
    (entry: WordpressImportEntry, autoMatched = false) => {
      setTitle(entry.title)
      setSlugTouched(false)
      setSlug(entry.wpSlug?.trim() || slugifyArtworkTitle(entry.title))
      setYearCreated(entry.year != null ? String(entry.year) : '')
      setMedium(entry.medium ?? '')
      setWidth(entry.widthWhole != null ? String(entry.widthWhole) : '')
      setHeight(entry.heightWhole != null ? String(entry.heightWhole) : '')
      setWidthFraction(entry.widthFraction ?? '')
      setHeightFraction(entry.heightFraction ?? '')
      setDepth('')
      setDepthFraction('')
      setDimensionUnit(entry.dimensionUnit ?? 'cm')
      setSpansYears(false)
      setYearCompleted('')
      setCity(entry.city ?? '')
      setCountry(entry.country ?? '')
      setStreetPhotoCaption(entry.streetPhotoCaption ?? '')
      setCityPopulation(entry.cityPopulation)
      setCityAreaKm2(entry.cityAreaKm2)
      setCityPopulationDensity(entry.cityPopulationDensity)
      setCityElevationM(entry.cityElevationM)
      setLocationCreatedLabel(entry.locationCreatedLabel ?? '')
      setAchMapLat(entry.achMapLat)
      setAchMapLng(entry.achMapLng)
      setAchMapPresence(entry.achMapPresence)
      setProvenanceNotesPlain(entry.provenanceNotes ?? '')
      setSourceImageUrls(entry.sourceImageUrls ?? [])
      setStoryEn(entry.storyEn ?? '')
      setGatesOfPerception(entry.gatesOfPerception)
      setMegacitiesSeriesType(entry.megacitiesSeriesType ?? '')
      setMegacitiesStyleLabel(entry.megacitiesStyleLabel ?? '')
      setMegacitiesCoverageArea(entry.megacitiesCoverageArea ?? '')
      setWpId(entry.id)
      setWpRefImageUrl(entry.artworkImageUrl)
      if (entry.availabilityStatus) {
        setAvailabilityStatus(entry.availabilityStatus)
      }
      setOrientationOverride(entry.orientation ?? '')
      setSizeTierOverride(entry.sizeTier ?? '')
      if (entry.seriesSlug) {
        const match = seriesList.find((s) => s.slug === entry.seriesSlug)
        if (match) setSeriesId(String(match.id))
      }
      setWpPick(String(entry.id))
      setWpLoadedLabel(formatWpImportLabel(entry))
      setWpAutoMatched(autoMatched)
      setError(null)
    },
    [seriesList],
  )

  function onWpSelect(id: string) {
    setWpPick(id)
    setWpAutoMatched(false)
    if (!id) {
      setWpLoadedLabel(null)
      setWpRefImageUrl(null)
      setWpId(null)
      return
    }
    const entry = wpEntries.find((e) => String(e.id) === id)
    if (entry) applyWpEntry(entry)
  }

  function handlePrimaryUploaded(mediaId: number, meta?: { filename: string }) {
    setPrimaryMediaId(mediaId)
    if (!meta?.filename || wpPick || !wpEntries.length) return
    if (!useWp && !isDcs && !isAch && !isMegacities) return
    const match = matchWpImportEntryByFilename(
      meta.filename,
      wpEntries,
      isAchSeriesSlug(selectedSeries?.slug)
        ? ACH_ROOT_SERIES_SLUG
        : selectedSeries?.slug,
    )
    if (match) {
      if (!useWp) setUseWp(true)
      applyWpEntry(match, true)
    }
  }

  useEffect(() => {
    if (!wpPick || seriesId || !seriesList.length) return
    const entry = wpEntries.find((e) => String(e.id) === wpPick)
    if (!entry?.seriesSlug) return
    const match = seriesList.find((s) => s.slug === entry.seriesSlug)
    if (match) setSeriesId(String(match.id))
  }, [wpPick, seriesId, seriesList, wpEntries])

  const isInches = dimensionUnit === 'in'
  const widthWholeNum = isInches ?
    width.trim() === '' ? NaN : Number.parseInt(width, 10)
  : Number.parseFloat(width)
  const heightWholeNum = isInches ?
    height.trim() === '' ? NaN : Number.parseInt(height, 10)
  : Number.parseFloat(height)
  const depthWholeNum =
    depth.trim() === '' ? undefined
    : isInches ? Number.parseInt(depth, 10)
    : Number.parseFloat(depth)

  const derived = useMemo(() => {
    const orientation = deriveOrientation({
      widthWhole: Number.isFinite(widthWholeNum) ? widthWholeNum : 0,
      heightWhole: Number.isFinite(heightWholeNum) ? heightWholeNum : 0,
      widthFraction: isInches ? widthFraction : undefined,
      heightFraction: isInches ? heightFraction : undefined,
    })
    const sizeTier = deriveSizeTier({
      widthWhole: Number.isFinite(widthWholeNum) ? widthWholeNum : 0,
      heightWhole: Number.isFinite(heightWholeNum) ? heightWholeNum : 0,
      depthWhole: depthWholeNum,
      widthFraction: isInches ? widthFraction : undefined,
      heightFraction: isInches ? heightFraction : undefined,
      depthFraction: isInches ? depthFraction : undefined,
      dimensionUnit,
    })
    const aspectRatio = deriveAspectRatio({
      widthWhole: Number.isFinite(widthWholeNum) ? widthWholeNum : 0,
      heightWhole: Number.isFinite(heightWholeNum) ? heightWholeNum : 0,
      widthFraction: isInches ? widthFraction : undefined,
      heightFraction: isInches ? heightFraction : undefined,
      dimensionUnit,
    })
    if (!sizeTier || !aspectRatio) return null
    return { orientation, sizeTier, aspectRatio }
  }, [
    widthWholeNum,
    heightWholeNum,
    depthWholeNum,
    widthFraction,
    heightFraction,
    depthFraction,
    dimensionUnit,
    isInches,
  ])

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
    if (!Number.isFinite(widthWholeNum) || !Number.isFinite(heightWholeNum)) {
      setError('Width and height are required.')
      return
    }
    if (isInches) {
      for (const [label, fraction] of [
        ['Width', widthFraction],
        ['Height', heightFraction],
        ['Depth', depthFraction],
      ] as const) {
        if (!isValidDimensionFraction(fraction)) {
          setError(`${label} fraction must look like 3/16.`)
          return
        }
      }
    }
    const widthQty = resolvePhysicalDimension(
      widthWholeNum,
      isInches ? widthFraction : undefined,
    )
    const heightQty = resolvePhysicalDimension(
      heightWholeNum,
      isInches ? heightFraction : undefined,
    )
    if (widthQty == null || widthQty <= 0 || heightQty == null || heightQty <= 0) {
      setError('Width and height must be greater than zero.')
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
          widthWhole: widthWholeNum,
          widthFraction: isInches ? widthFraction.trim() || undefined : undefined,
          heightWhole: heightWholeNum,
          heightFraction: isInches ? heightFraction.trim() || undefined : undefined,
          depthWhole: depthWholeNum,
          depthFraction: isInches ? depthFraction.trim() || undefined : undefined,
          dimensionUnit,
          orientation,
          sizeTier,
          availabilityStatus,
          primaryImageMediaId: primaryMediaId,
          wpId: wpId ?? undefined,
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          streetPhotoCaption: isDcs ? streetPhotoCaption.trim() || undefined : undefined,
          cityPopulation: isDcs ? cityPopulation ?? undefined : undefined,
          cityAreaKm2: isDcs ? cityAreaKm2 ?? undefined : undefined,
          cityPopulationDensity: isDcs ? cityPopulationDensity ?? undefined : undefined,
          cityElevationM: isDcs ? cityElevationM ?? undefined : undefined,
          dcsStreetMediaId: isDcs ? dcsStreetId ?? undefined : undefined,
          dcsSatelliteMediaId: isDcs ? dcsSatelliteId ?? undefined : undefined,
          achSourceMediaIds: isAch && achSourceIds.length ? achSourceIds : undefined,
          locationCreatedLabel:
            isAch && locationCreatedLabel.trim() ? locationCreatedLabel.trim() : undefined,
          achMapLat: isAch && achMapLat != null ? achMapLat : undefined,
          achMapLng: isAch && achMapLng != null ? achMapLng : undefined,
          achMapPresence: isAch && achMapPresence ? true : undefined,
          provenanceNotes:
            provenanceNotesPlain.trim() ? provenanceNotesPlain.trim() : undefined,
          gatesOfPerception: isAch && gatesOfPerception ? true : undefined,
          megacitiesSeriesType:
            isMegacities && megacitiesSeriesType ? megacitiesSeriesType : undefined,
          megacitiesCoverageArea:
            isMegacities && megacitiesCoverageArea.trim()
              ? megacitiesCoverageArea.trim()
              : undefined,
          megacitiesClassificationNote:
            isMegacities && megacitiesStyleLabel.trim()
              ? megacitiesStyleLabel.trim()
              : undefined,
          megacitiesReferenceCollageMediaId:
            isMegacities && megacitiesReferenceCollageId
              ? megacitiesReferenceCollageId
              : undefined,
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
    setWpRefImageUrl(null)
    setWpId(null)
    setWpAutoMatched(false)
    setCity('')
    setCountry('')
    setStreetPhotoCaption('')
    setCityPopulation(null)
    setCityAreaKm2(null)
    setCityPopulationDensity(null)
    setCityElevationM(null)
    setLocationCreatedLabel('')
    setAchMapLat(null)
    setAchMapLng(null)
    setAchMapPresence(false)
    setProvenanceNotesPlain('')
    setSourceImageUrls([])
    setStoryEn('')
    setGatesOfPerception(false)
    setMegacitiesSeriesType('')
    setMegacitiesStyleLabel('')
    setMegacitiesCoverageArea('')
    setMegacitiesReferenceCollageId(null)
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
              setWpRefImageUrl(null)
              setWpAutoMatched(false)
              setWpLoadError(null)
            }
          }}
        />
        Pre-populate fields from WordPress export
      </label>
      {isDcs && !useWp ? (
        <p className="art-official-upload__hint">
          Digital City Series: select the series first, then upload an image — matching
          legacy records auto-fills title, city, dimensions, and city stats when the
          filename matches.
        </p>
      ) : null}
      {isAch && !useWp ? (
        <p className="art-official-upload__hint">
          A Colorful History: select the series first, then upload an image — matching
          legacy records auto-fills title, studio location, dimensions, and map coordinates
          when the filename matches.
        </p>
      ) : null}
      {isMegacities && !useWp ? (
        <p className="art-official-upload__hint">
          Megacities: select the series first, then upload an image — matching legacy
          records auto-fills title, country scope, dimensions (including 1.5m × 2m sizes),
          series type, and provenance when the filename matches.
        </p>
      ) : null}

      {useWp ||
      (isDcs && wpEntries.length > 0) ||
      (isAch && wpEntries.length > 0) ||
      (isMegacities && wpEntries.length > 0) ? (
        <fieldset className="art-official-upload__legacy">
          <legend>Legacy WordPress export</legend>
          <p className="art-official-upload__legacy-hint">
            Loads matching fields from <code>data/legacy/wp-artworks.json</code> — title,
            slug, year, city, country, dimensions, medium, series, and series-specific
            fields (DCS city stats · ACH studio location, map coords, provenance · Megacities
            series type and coverage). You still upload new images below; old URLs are reference
            only.
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
                  Loaded: <strong>{wpLoadedLabel}</strong>
                  {wpAutoMatched ? ' (matched from filename)' : ''} — review fields, then
                  add your photos.
                </p>
              ) : null}
              {wpRefImageUrl ? (
                <p className="art-official-upload__legacy-ref">
                  Legacy primary image:{' '}
                  <a href={wpRefImageUrl} target="_blank" rel="noreferrer">
                    {wpRefImageUrl.split('/').pop()}
                  </a>
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
            onUploaded={handlePrimaryUploaded}
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

        <div className="art-official-upload__dims-row">
          <label className="art-official-upload__field">
            City
            <input
              value={city}
              disabled={submitting}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label className="art-official-upload__field">
            Country
            <input
              value={country}
              disabled={submitting}
              onChange={(e) => setCountry(e.target.value)}
            />
          </label>
        </div>

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
              Street photo caption
              <input
                value={streetPhotoCaption}
                disabled={submitting}
                placeholder="e.g. Wat Saket"
                onChange={(e) => setStreetPhotoCaption(e.target.value)}
              />
              <p className="art-official-upload__hint">
                Saved to street photo caption when you upload the Micro image.
              </p>
            </label>
            {cityPopulation != null ||
            cityAreaKm2 != null ||
            cityPopulationDensity != null ||
            cityElevationM != null ? (
              <p className="art-official-upload__legacy-stats">
                Legacy city data:{' '}
                {[
                  cityPopulation != null ?
                    `Population ${cityPopulation.toLocaleString()}`
                  : null,
                  cityAreaKm2 != null ? `Area ${cityAreaKm2} km²` : null,
                  cityPopulationDensity != null ?
                    `Density ${cityPopulationDensity.toLocaleString()}/km²`
                  : null,
                  cityElevationM != null ? `Elevation ${cityElevationM} m` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
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
            <label className="art-official-upload__checkbox">
              <input
                type="checkbox"
                checked={gatesOfPerception}
                disabled={
                  submitting ||
                  selectedSeries?.slug === GATES_OF_PERCEPTION_SERIES_SLUG
                }
                onChange={(e) => setGatesOfPerception(e.target.checked)}
              />
              Part of the <strong>Gates of Perception</strong> sub-series
            </label>
            {gatesOfPerception ? (
              <p className="art-official-upload__hint">
                Saves as series{' '}
                <code>{GATES_OF_PERCEPTION_SERIES_SLUG}</code>
                {gatesSeries ? '' : ' (run seed-series if missing in CMS)'}
                {' '}and sets <code>ach.internalGroupTitle</code>.
              </p>
            ) : null}
            {locationCreatedLabel ? (
              <label className="art-official-upload__field">
                Studio / making location (legacy)
                <input
                  value={locationCreatedLabel}
                  disabled={submitting}
                  onChange={(e) => setLocationCreatedLabel(e.target.value)}
                />
              </label>
            ) : null}
            {achMapLat != null && achMapLng != null ? (
              <p className="art-official-upload__hint">
                Legacy map coordinates: {achMapLat}, {achMapLng}
                {achMapPresence ? ' · will appear on ACH map' : ''}
              </p>
            ) : null}
            {storyEn ? (
              <p className="art-official-upload__hint">
                Legacy story on file (not imported — use Art/Official session for narrative).
              </p>
            ) : null}
            {provenanceNotesPlain ? (
              <p className="art-official-upload__hint">
                Legacy provenance imported on submit (staff-only field).
              </p>
            ) : null}
            {sourceImageUrls.length > 0 ? (
              <div className="art-official-upload__legacy-ref">
                <p>Legacy source photograph URLs (re-upload below):</p>
                <ul>
                  {sourceImageUrls.map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        {url.split('/').pop()}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
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

        {isMegacities ? (
          <fieldset className="art-official-upload__series-media">
            <legend>Megacities — composition</legend>
            <label className="art-official-upload__field">
              Series type
              <select
                value={megacitiesSeriesType}
                disabled={submitting}
                onChange={(e) =>
                  setMegacitiesSeriesType(e.target.value as MegacitiesSeriesType | '')
                }
              >
                <option value="">Select type…</option>
                <option value="composite_country">Composite country</option>
                <option value="skate_city">Skate City</option>
                <option value="cultural_composite">Cultural composite</option>
                <option value="exhibition_origin">Exhibition origin</option>
              </select>
              {megacitiesStyleLabel ? (
                <p className="art-official-upload__hint">
                  Legacy WP style: {megacitiesStyleLabel}
                </p>
              ) : null}
            </label>
            <label className="art-official-upload__field">
              Coverage area
              <input
                value={megacitiesCoverageArea}
                disabled={submitting}
                placeholder="e.g. China, Arab League, USA"
                onChange={(e) => setMegacitiesCoverageArea(e.target.value)}
              />
            </label>
            {provenanceNotesPlain ? (
              <p className="art-official-upload__hint">
                Legacy provenance imported on submit (staff-only field).
              </p>
            ) : null}
            {sourceImageUrls.length > 0 ? (
              <div className="art-official-upload__legacy-ref">
                <p>Legacy reference image URLs (re-upload below):</p>
                <ul>
                  {sourceImageUrls.map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        {url.split('/').pop()}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <label className="art-official-upload__field">
              Reference collage (optional)
              <UploadWithThumbnail
                mediaId={megacitiesReferenceCollageId}
                disabled={submitting}
                altLabel="Megacities reference collage"
                onUploaded={setMegacitiesReferenceCollageId}
              />
            </label>
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
            Unit
            <select
              value={dimensionUnit}
              onChange={(e) => {
                const next = e.target.value as 'cm' | 'in'
                setDimensionUnit(next)
                if (next === 'cm') {
                  setWidthFraction('')
                  setHeightFraction('')
                  setDepthFraction('')
                }
              }}
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </label>
          <label>
            Width {isInches ? '(in)' : '(cm)'}
            <div className="art-official-upload__dim-pair">
              <input
                required
                type="number"
                min={0}
                step={isInches ? 1 : 'any'}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder={isInches ? '48' : '90'}
              />
              {isInches ? (
                <input
                  type="text"
                  value={widthFraction}
                  onChange={(e) => setWidthFraction(e.target.value)}
                  placeholder="3/16"
                  aria-label="Width fraction"
                />
              ) : null}
            </div>
          </label>
          <label>
            Height {isInches ? '(in)' : '(cm)'}
            <div className="art-official-upload__dim-pair">
              <input
                required
                type="number"
                min={0}
                step={isInches ? 1 : 'any'}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder={isInches ? '36' : '120'}
              />
              {isInches ? (
                <input
                  type="text"
                  value={heightFraction}
                  onChange={(e) => setHeightFraction(e.target.value)}
                  placeholder="3/16"
                  aria-label="Height fraction"
                />
              ) : null}
            </div>
          </label>
          <label>
            Depth (optional) {isInches ? '(in)' : '(cm)'}
            <div className="art-official-upload__dim-pair">
              <input
                type="number"
                min={0}
                step={isInches ? 1 : 'any'}
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
              />
              {isInches ? (
                <input
                  type="text"
                  value={depthFraction}
                  onChange={(e) => setDepthFraction(e.target.value)}
                  placeholder="3/16"
                  aria-label="Depth fraction"
                />
              ) : null}
            </div>
          </label>
        </div>
        {isInches ? (
          <p className="art-official-upload__hint">
            Inches use a whole number plus an optional fraction (e.g. 48 and 3/16).
          </p>
        ) : null}

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

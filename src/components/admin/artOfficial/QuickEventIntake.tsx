'use client'

import { Button } from '@payloadcms/ui'
import Link from 'next/link'
import { useCallback, useState, type FormEvent, type ReactNode } from 'react'

import { EVENT_TYPE_OPTIONS } from '@/lib/artOfficial/eventTypeOptions'

import './artOfficialHome.scss'

type SubmitResult = {
  id: number
  slug: string
  title: string
  adminUrl: string
}

const AWARD_OUTCOMES = [
  { label: 'Winner', value: 'winner' },
  { label: 'Shortlisted', value: 'shortlisted' },
  { label: 'Nominated', value: 'nominated' },
  { label: 'Honourable mention', value: 'honourable-mention' },
] as const

const PREMIERE_OPTIONS = [
  { label: 'World', value: 'world' },
  { label: 'European', value: 'european' },
  { label: 'National', value: 'national' },
  { label: 'None', value: 'none' },
] as const

const PERFORMANCE_TYPES = [
  { label: 'Live', value: 'live' },
  { label: 'Durational', value: 'durational' },
  { label: 'Participatory', value: 'participatory' },
  { label: 'Lecture-performance', value: 'lecture-performance' },
  { label: 'Sound', value: 'sound' },
  { label: 'Other', value: 'other' },
] as const

function TypeFields({
  legend,
  children,
}: {
  legend: string
  children: ReactNode
}) {
  return (
    <fieldset className="art-official-upload__series-media">
      <legend>{legend}</legend>
      <div className="art-official-upload__form">{children}</div>
    </fieldset>
  )
}

export function QuickEventIntake() {
  const [eventType, setEventType] = useState('solo-exhibition')
  const [title, setTitle] = useState('')
  const [yearStart, setYearStart] = useState(String(new Date().getFullYear()))
  const [venueName, setVenueName] = useState('')
  const [venueCity, setVenueCity] = useState('')
  const [venueCountry, setVenueCountry] = useState('')
  const [eventTypeCustom, setEventTypeCustom] = useState('')
  const [awardGrantingOrganisation, setAwardGrantingOrganisation] = useState('')
  const [awardOutcome, setAwardOutcome] = useState('')
  const [residencyOrganisation, setResidencyOrganisation] = useState('')
  const [publicationTitle, setPublicationTitle] = useState('')
  const [publicationAuthor, setPublicationAuthor] = useState('')
  const [bibliographyAuthor, setBibliographyAuthor] = useState('')
  const [eventFormatType, setEventFormatType] = useState('')
  const [premiereStatus, setPremiereStatus] = useState('')
  const [performanceType, setPerformanceType] = useState('')
  const [institution, setInstitution] = useState('')
  const [degree, setDegree] = useState('')
  const [subject, setSubject] = useState('')
  const [commissionClient, setCommissionClient] = useState('')
  const [commissionSite, setCommissionSite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)

  const resetFormKeepType = useCallback(() => {
    setTitle('')
    setYearStart(String(new Date().getFullYear()))
    setVenueName('')
    setVenueCity('')
    setVenueCountry('')
    setEventTypeCustom('')
    setAwardGrantingOrganisation('')
    setAwardOutcome('')
    setResidencyOrganisation('')
    setPublicationTitle('')
    setPublicationAuthor('')
    setBibliographyAuthor('')
    setEventFormatType('')
    setPremiereStatus('')
    setPerformanceType('')
    setInstitution('')
    setDegree('')
    setSubject('')
    setCommissionClient('')
    setCommissionSite('')
    setResult(null)
    setError(null)
  }, [])

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    setSubmitting(true)
    setError(null)
    setResult(null)
    const year = Number(yearStart)
    if (!title.trim() || !Number.isFinite(year)) {
      setError('Title and year are required.')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/art-official/quick-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          title: title.trim(),
          yearStart: year,
          venueName: venueName.trim() || undefined,
          venueCity: venueCity.trim() || undefined,
          venueCountry: venueCountry.trim() || undefined,
          eventTypeCustom: eventTypeCustom.trim() || undefined,
          awardGrantingOrganisation: awardGrantingOrganisation.trim() || undefined,
          awardOutcome: awardOutcome || undefined,
          residencyOrganisation: residencyOrganisation.trim() || undefined,
          publicationTitle: publicationTitle.trim() || undefined,
          publicationAuthor: publicationAuthor.trim() || undefined,
          bibliographyAuthor: bibliographyAuthor.trim() || undefined,
          eventFormatType: eventFormatType.trim() || undefined,
          premiereStatus: premiereStatus || undefined,
          performanceType: performanceType || undefined,
          institution: institution.trim() || undefined,
          degree: degree.trim() || undefined,
          subject: subject.trim() || undefined,
          commissionClient: commissionClient.trim() || undefined,
          commissionSite: commissionSite.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Submit failed')
      }
      setResult(data as SubmitResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="art-official-upload">
      <p className="art-official-upload__intro">
        Fast intake with no AI. Creates a published CV line with enrichment status{' '}
        <strong>stub</strong> — build the public page later from the Events Queue.
      </p>

      {result ? (
        <div className="art-official-upload__success" role="status">
          <p>
            Saved <strong>{result.title}</strong> (no public page yet).{' '}
            <Link href={result.adminUrl}>Open in admin</Link>
          </p>
          <Button buttonStyle="secondary" onClick={resetFormKeepType}>
            Add another
          </Button>
        </div>
      ) : (
      <form className="art-official-upload__form" onSubmit={(e) => void submit(e)}>
        <label className="art-official-upload__field">
          Event type
          <select
            value={eventType}
            disabled={submitting}
            onChange={(e) => setEventType(e.target.value)}
          >
            {EVENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="art-official-upload__field">
          Title
          <input
            required
            value={title}
            disabled={submitting}
            placeholder="As it appears on the CV"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="art-official-upload__field">
          Year
          <input
            type="number"
            min={1000}
            max={9999}
            required
            value={yearStart}
            disabled={submitting}
            onChange={(e) => setYearStart(e.target.value)}
          />
        </label>

        <fieldset className="art-official-upload__series-media">
          <legend>Venue &amp; location</legend>
          <div className="art-official-upload__event-row">
            <label className="art-official-upload__field">
              Venue name
              <input
                value={venueName}
                disabled={submitting}
                placeholder="Gallery, fair, institution…"
                onChange={(e) => setVenueName(e.target.value)}
              />
            </label>
            <label className="art-official-upload__field">
              City
              <input
                value={venueCity}
                disabled={submitting}
                onChange={(e) => setVenueCity(e.target.value)}
              />
            </label>
            <label className="art-official-upload__field">
              Country
              <input
                value={venueCountry}
                disabled={submitting}
                onChange={(e) => setVenueCountry(e.target.value)}
              />
            </label>
          </div>
        </fieldset>

        {eventType === 'other' ? (
          <TypeFields legend="Other">
            <label className="art-official-upload__field">
              Custom type label
              <input
                value={eventTypeCustom}
                disabled={submitting}
                onChange={(e) => setEventTypeCustom(e.target.value)}
              />
            </label>
          </TypeFields>
        ) : null}

        {eventType === 'award' ? (
          <TypeFields legend="Award">
            <label className="art-official-upload__field">
              Award granting organisation
              <input
                value={awardGrantingOrganisation}
                disabled={submitting}
                onChange={(e) => setAwardGrantingOrganisation(e.target.value)}
              />
            </label>
            <label className="art-official-upload__field">
              Outcome
              <select
                value={awardOutcome}
                disabled={submitting}
                onChange={(e) => setAwardOutcome(e.target.value)}
              >
                <option value="">Select…</option>
                {AWARD_OUTCOMES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </TypeFields>
        ) : null}

        {eventType === 'residency' ? (
          <TypeFields legend="Residency">
            <label className="art-official-upload__field">
              Organisation
              <input
                value={residencyOrganisation}
                disabled={submitting}
                onChange={(e) => setResidencyOrganisation(e.target.value)}
              />
            </label>
          </TypeFields>
        ) : null}

        {eventType === 'publication' ? (
          <TypeFields legend="Publication">
            <label className="art-official-upload__field">
              Publication title
              <input
                value={publicationTitle}
                disabled={submitting}
                onChange={(e) => setPublicationTitle(e.target.value)}
              />
            </label>
            <label className="art-official-upload__field">
              Author (if not you)
              <input
                value={publicationAuthor}
                disabled={submitting}
                onChange={(e) => setPublicationAuthor(e.target.value)}
              />
            </label>
          </TypeFields>
        ) : null}

        {eventType === 'bibliography' ? (
          <TypeFields legend="Bibliography">
            <label className="art-official-upload__field">
              Author
              <input
                value={bibliographyAuthor}
                disabled={submitting}
                onChange={(e) => setBibliographyAuthor(e.target.value)}
              />
            </label>
            <label className="art-official-upload__field">
              Publication title
              <input
                value={publicationTitle}
                disabled={submitting}
                onChange={(e) => setPublicationTitle(e.target.value)}
              />
            </label>
          </TypeFields>
        ) : null}

        {eventType === 'talk-panel' ? (
          <TypeFields legend="Talk / panel">
            <label className="art-official-upload__field">
              Event format type
              <input
                value={eventFormatType}
                disabled={submitting}
                placeholder="e.g. Pecha Kucha (20×20), keynote"
                onChange={(e) => setEventFormatType(e.target.value)}
              />
            </label>
          </TypeFields>
        ) : null}

        {eventType === 'screening' ? (
          <TypeFields legend="Screening">
            <label className="art-official-upload__field">
              Premiere status
              <select
                value={premiereStatus}
                disabled={submitting}
                onChange={(e) => setPremiereStatus(e.target.value)}
              >
                <option value="">Select…</option>
                {PREMIERE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </TypeFields>
        ) : null}

        {eventType === 'performance' ? (
          <TypeFields legend="Performance">
            <label className="art-official-upload__field">
              Performance type
              <select
                value={performanceType}
                disabled={submitting}
                onChange={(e) => setPerformanceType(e.target.value)}
              >
                <option value="">Select…</option>
                {PERFORMANCE_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </TypeFields>
        ) : null}

        {eventType === 'education' ? (
          <TypeFields legend="Education">
            <label className="art-official-upload__field">
              Institution
              <input
                value={institution}
                disabled={submitting}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </label>
            <label className="art-official-upload__field">
              Degree
              <input
                value={degree}
                disabled={submitting}
                onChange={(e) => setDegree(e.target.value)}
              />
            </label>
            <label className="art-official-upload__field">
              Subject
              <input
                value={subject}
                disabled={submitting}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
          </TypeFields>
        ) : null}

        {eventType === 'public-commission' ? (
          <TypeFields legend="Public commission">
            <label className="art-official-upload__field">
              Commission client
              <input
                value={commissionClient}
                disabled={submitting}
                onChange={(e) => setCommissionClient(e.target.value)}
              />
            </label>
            <label className="art-official-upload__field">
              Commission site
              <input
                value={commissionSite}
                disabled={submitting}
                onChange={(e) => setCommissionSite(e.target.value)}
              />
            </label>
          </TypeFields>
        ) : null}

        {error ? <p className="art-official-home__error">{error}</p> : null}

        <div className="art-official-upload__actions">
          <Button type="submit" buttonStyle="primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Add to CV'}
          </Button>
        </div>
      </form>
      )}
    </section>
  )
}

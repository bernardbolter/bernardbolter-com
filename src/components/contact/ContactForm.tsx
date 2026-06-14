'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import LexicalProse from '@/lib/contact/LexicalProse'

import './contact-page.css'

const FORMCARRY_ENDPOINT = 'https://formcarry.com/s/BuS16rcQ__y'

const SUBJECT_OPTIONS = [
  'Interested in a work',
  'Commission enquiry',
  'Exhibition or collaboration',
  'I own one of your works',
  'Archive — corrections or additions',
  'Other',
] as const

const OWNERSHIP_SUBJECT = 'I own one of your works' as const

type SubjectOption = (typeof SUBJECT_OPTIONS)[number]

type ContactErrors = {
  subject?: string
  name?: string
  email?: string
  message?: string
}

type Props = {
  enquiryIntro: unknown
}

function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const INTRO_CLASS =
  'mx-auto mb-[0.9375rem] w-full max-w-[34.375rem] font-body text-sm leading-[1.6] text-dark m:text-lg [&_p]:indent-[0.75rem] [&_p]:pb-[1.25rem]'

const fieldClass =
  'w-full border-0 border-b border-[var(--ui-icon)] bg-[#ddd] px-[0.6875rem] py-[0.375rem] font-body text-sm text-[var(--ui-icon)] outline-none focus:border-[var(--status-success)]'

export default function ContactForm({ enquiryIntro }: Props) {
  const searchParams = useSearchParams()
  const claimSlug = searchParams.get('claim')?.trim() || ''
  const claimTitle = searchParams.get('title')?.trim() || ''
  const messageRef = useRef<HTMLTextAreaElement>(null)

  const [subject, setSubject] = useState<SubjectOption | ''>('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<ContactErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [claimPrefillApplied, setClaimPrefillApplied] = useState(false)

  useEffect(() => {
    if (!claimSlug || claimPrefillApplied) return

    const prefill = claimTitle ? `I believe I own "${claimTitle}". ` : 'I believe I own this work. '
    setSubject(OWNERSHIP_SUBJECT)
    setMessage(prefill)
    setClaimPrefillApplied(true)

    requestAnimationFrame(() => {
      const textarea = messageRef.current
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(prefill.length, prefill.length)
    })
  }, [claimSlug, claimTitle, claimPrefillApplied])

  const runValidation = (): ContactErrors => {
    const nextErrors: ContactErrors = {}

    if (!subject) nextErrors.subject = 'Please choose a subject'
    if (!name.trim()) nextErrors.name = 'Name is required'
    else if (name.trim().length < 2) nextErrors.name = 'Name must be at least 2 characters'

    if (!email.trim()) nextErrors.email = 'Email is required'
    else if (!validateEmail(email.trim())) nextErrors.email = 'Please enter a valid email address'

    if (!message.trim()) nextErrors.message = 'Message is required'
    else if (message.trim().length < 10) {
      nextErrors.message = 'Message must be at least 10 characters'
    }

    return nextErrors
  }

  const submit = async () => {
    setSubmitError('')
    setSubmitSuccess(false)

    const nextErrors = runValidation()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch(FORMCARRY_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          name,
          email,
          message,
          ...(claimSlug ? { artworkSlug: claimSlug } : {}),
        }),
      })

      const json = (await response.json()) as { code?: number }
      if (json.code === 200) {
        setSubmitSuccess(true)
        setSubject('')
        setName('')
        setEmail('')
        setMessage('')
        setErrors({})
        return
      }

      if (json.code === 422) {
        setSubmitError('Form submission failed. Please check your data and try again.')
        return
      }

      setSubmitError('An unknown server error occurred. Please try again.')
    } catch {
      setSubmitError('A network error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <section className="mx-auto w-full max-w-[34.375rem]">
      {enquiryIntro ? <LexicalProse content={enquiryIntro} className={INTRO_CLASS} /> : null}

      {claimSlug && claimTitle ? (
        <p className="mx-auto mb-2 w-full max-w-[34.375rem] font-body text-sm text-[var(--text-muted)]">
          Regarding: {claimTitle}
        </p>
      ) : null}

      <div
        className="contact-form-block mx-auto mb-[0.9375rem] mt-[1.875rem] w-full max-w-[34.375rem] rounded-[0.375rem] border border-[var(--ui-icon)] bg-white px-[5%] pb-[0.9375rem] pt-[1.875rem]"
        onKeyDown={handleKeyDown}
      >
        <div className={`contact-form-block mb-2 flex flex-col gap-2 ${errors.subject ? 'has-error' : ''}`}>
          <label htmlFor="contact-subject" className="mt-[0.1875rem] font-heading text-xs font-medium tracking-[0.05px] text-[var(--ui-icon)]">
            subject
          </label>
          <select
            id="contact-subject"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value as SubjectOption | '')
              if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }))
            }}
            className={`${fieldClass} ${errors.subject ? 'error' : ''}`}
          >
            <option value="">choose a subject</option>
            {SUBJECT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.subject ? (
            <span className="error-message mb-[0.625rem] text-[0.625rem] text-[var(--status-error)]">
              {errors.subject}
            </span>
          ) : null}
        </div>

        <div className={`contact-form-block mb-2 flex flex-col gap-2 ${errors.name ? 'has-error' : ''}`}>
          <label htmlFor="contact-name" className="mt-[0.1875rem] font-heading text-xs font-medium tracking-[0.05px] text-[var(--ui-icon)]">
            name
          </label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
            }}
            placeholder="name"
            className={`${fieldClass} ${errors.name ? 'error' : ''}`}
          />
          {errors.name ? (
            <span className="error-message mb-[0.625rem] text-[0.625rem] text-[var(--status-error)]">
              {errors.name}
            </span>
          ) : null}
        </div>

        <div className={`contact-form-block mb-2 flex flex-col gap-2 ${errors.email ? 'has-error' : ''}`}>
          <label htmlFor="contact-email" className="mt-[0.1875rem] font-heading text-xs font-medium tracking-[0.05px] text-[var(--ui-icon)]">
            email
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
            }}
            placeholder="email"
            className={`${fieldClass} ${errors.email ? 'error' : ''}`}
          />
          {errors.email ? (
            <span className="error-message mb-[0.625rem] text-[0.625rem] text-[var(--status-error)]">
              {errors.email}
            </span>
          ) : null}
        </div>

        <div className={`contact-form-block mb-2 flex flex-col gap-2 ${errors.message ? 'has-error' : ''}`}>
          <label htmlFor="contact-message" className="mt-[0.1875rem] font-heading text-xs font-medium tracking-[0.05px] text-[var(--ui-icon)]">
            message
          </label>
          <textarea
            ref={messageRef}
            id="contact-message"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value)
              if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }))
            }}
            placeholder="message"
            rows={5}
            className={`min-h-[7.5rem] resize-y leading-[1.5] ${fieldClass} ${errors.message ? 'error' : ''}`}
          />
          {errors.message ? (
            <span className="error-message mb-[0.625rem] text-[0.625rem] text-[var(--status-error)]">
              {errors.message}
            </span>
          ) : null}
        </div>

        <div className="contact-form-block">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSubmitting}
            className="my-[0.625rem] flex w-[9.375rem] items-center justify-center rounded-[0.125rem] border-0 bg-[#ddd] py-[0.625rem] font-heading text-base font-semibold tracking-[0.03em] text-[var(--ui-icon)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-[#999] disabled:opacity-70"
          >
            {isSubmitting ? 'sending...' : 'send message'}
          </button>
        </div>

        {submitError ? (
          <div className="contact-alert flex items-center gap-3 rounded-[0.375rem] border border-[rgba(217,83,79,0.3)] bg-[rgba(217,83,79,0.1)] p-4 text-[var(--status-error)]">
            <span className="text-xl font-bold">⚠</span>
            {submitError}
          </div>
        ) : null}

        {submitSuccess ? (
          <div className="contact-alert flex items-center gap-3 rounded-[0.375rem] border border-[rgba(86,186,90,0.3)] bg-[rgba(86,186,90,0.1)] p-4 text-[var(--status-success)]">
            <span className="text-xl font-bold">✓</span>
            received your submission, thank you!
          </div>
        ) : null}
      </div>
    </section>
  )
}

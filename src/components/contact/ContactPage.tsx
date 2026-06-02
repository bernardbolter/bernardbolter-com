'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { BackArrowSvg, CloseCircleSvg, LinkSvg } from '@/components/icons'
import HeaderTitle from '@/components/info/HeaderTitle'

type ContactErrors = {
  name?: string
  email?: string
  message?: string
}

const FORMCARRY_ENDPOINT = 'https://formcarry.com/s/BuS16rcQ__y'

function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<ContactErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentYear = useMemo(() => new Date().getFullYear(), [])

  const runValidation = (): ContactErrors => {
    const nextErrors: ContactErrors = {}

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
        body: JSON.stringify({ name, email, message }),
      })

      const json = (await response.json()) as { code?: number }
      if (json.code === 200) {
        setSubmitSuccess(true)
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

  return (
    <main className="relative min-h-screen bg-surface-page px-[5%] pb-space-6 pt-[3.5rem] m:px-[8%] l:mx-auto l:max-w-grid l:px-space-6">
      <HeaderTitle title="CONTACT" large />

      <Link
        href="/"
        className="fixed left-space-2 top-space-2 z-ui-top flex h-[2.125rem] items-center gap-space-2 rounded bg-surface-nav px-space-2 no-underline"
      >
        <span className="h-6 w-6 fill-dark">
          <CloseCircleSvg />
        </span>
        <span className="font-heading text-sm text-dark">close</span>
      </Link>

      <section className="relative z-overlay mx-auto grid max-w-[56rem] gap-space-6 pt-space-4 l:grid-cols-[1fr_minmax(16rem,20rem)]">
        <div className="space-y-space-4 font-body text-sm leading-relaxed text-dark">
          <p>
            Studio and collector inquiries are welcome. Please include artwork title, year, and
            context so requests can be answered quickly.
          </p>
          <p>
            For legal and privacy details, see{' '}
            <Link href="/datenschutz" className="inline-flex items-center gap-1 underline">
              <span className="h-3 w-3 fill-dark">
                <LinkSvg />
              </span>
              Datenschutz
            </Link>
            .
          </p>
        </div>

        <div className="rounded bg-surface-nav p-space-3 shadow-card">
          <div className="mb-space-2">
            <label htmlFor="contact-name" className="mb-1 block font-heading text-xs text-dark">
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
              className="w-full rounded border border-border bg-white px-space-2 py-space-1 font-body text-sm text-dark"
              placeholder="name"
            />
            {errors.name ? <p className="mt-1 text-xs text-error">{errors.name}</p> : null}
          </div>

          <div className="mb-space-2">
            <label htmlFor="contact-email" className="mb-1 block font-heading text-xs text-dark">
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
              className="w-full rounded border border-border bg-white px-space-2 py-space-1 font-body text-sm text-dark"
              placeholder="email"
            />
            {errors.email ? <p className="mt-1 text-xs text-error">{errors.email}</p> : null}
          </div>

          <div className="mb-space-2">
            <label htmlFor="contact-message" className="mb-1 block font-heading text-xs text-dark">
              message
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value)
                if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }))
              }}
              rows={5}
              className="w-full resize-y rounded border border-border bg-white px-space-2 py-space-1 font-body text-sm text-dark"
              placeholder="message"
            />
            {errors.message ? <p className="mt-1 text-xs text-error">{errors.message}</p> : null}
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="rounded bg-dark px-space-3 py-space-1 font-heading text-xs uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'sending...' : 'send message'}
          </button>

          {submitError ? <p className="mt-space-2 text-xs text-error">{submitError}</p> : null}
          {submitSuccess ? (
            <p className="mt-space-2 text-xs text-success">Received your submission, thank you.</p>
          ) : null}
        </div>
      </section>

      <section className="relative z-overlay mx-auto mt-space-6 max-w-[56rem] border-t border-border pt-space-3 font-body text-xs text-secondary">
        <h2 className="mb-space-2 font-heading text-sm text-dark">Impressum</h2>
        <p>Bernard John Bolter IV</p>
        <p>Charlottenburgerstr. 8a</p>
        <p>14169 Berlin Germany</p>
        <p>bernardbolter@gmail.com</p>
        <p className="mt-space-2">
          Kleinunternehmer im Sinne von § 19 Abs. 1 UStG wird die Umsatzsteuer nicht ausgewiesen.
        </p>
        <p className="mt-space-2">
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit,
          die Sie unter{' '}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            ec.europa.eu/consumers/odr/
          </a>{' '}
          finden. Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
        <p className="mt-space-3 font-heading text-dark">
          &copy; all rights reserved 1974 - {currentYear}
        </p>
      </section>

      <Link
        href="/"
        className="fixed bottom-space-2 left-space-2 z-ui-top flex items-center gap-space-2 rounded bg-surface-nav px-space-2 py-space-1 no-underline m:hidden"
      >
        <span className="h-4 w-4 fill-dark">
          <BackArrowSvg />
        </span>
        <span className="font-heading text-xs text-dark">all artwork</span>
      </Link>
    </main>
  )
}

'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const destination = useMemo(() => {
    const from = searchParams.get('from')?.trim()
    if (!from || !from.startsWith('/')) return '/studio'
    return from
  }, [searchParams])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { errors?: { message?: string }[] }
        const message = payload.errors?.[0]?.message || 'Login failed. Check email and password.'
        setError(message)
        return
      }

      window.location.assign(destination)
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="studio-login__form" onSubmit={onSubmit}>
      <label className="studio-login__label" htmlFor="studio-email">
        Email
      </label>
      <input
        id="studio-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <label className="studio-login__label" htmlFor="studio-password">
        Password
      </label>
      <input
        id="studio-password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error ? <p className="studio-login__error">{error}</p> : null}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

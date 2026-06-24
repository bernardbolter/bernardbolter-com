'use client'

import { useActionState } from 'react'

import {
  studioLoginAction,
  type StudioLoginState,
} from '@/lib/studio/studioLoginAction'

type Props = {
  destination: string
}

export function LoginForm({ destination }: Props) {
  const [state, formAction, submitting] = useActionState<StudioLoginState, FormData>(
    studioLoginAction,
    null,
  )

  return (
    <form className="studio-login__form" action={formAction}>
      <input type="hidden" name="from" value={destination} />

      <label className="studio-login__label" htmlFor="studio-email">
        Email
      </label>
      <input
        id="studio-email"
        name="email"
        type="email"
        autoComplete="email"
        required
      />

      <label className="studio-login__label" htmlFor="studio-password">
        Password
      </label>
      <input
        id="studio-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      {state?.error ? <p className="studio-login__error">{state.error}</p> : null}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

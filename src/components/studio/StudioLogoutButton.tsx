'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function StudioLogoutButton() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function onLogout() {
    setSubmitting(true)
    try {
      await fetch('/api/studio/logout', { method: 'POST', credentials: 'include' })
      router.replace('/studio/login')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <button
      type="button"
      className="studio-shell__logout"
      onClick={onLogout}
      disabled={submitting}
    >
      {submitting ? 'Signing out…' : 'Log out'}
    </button>
  )
}

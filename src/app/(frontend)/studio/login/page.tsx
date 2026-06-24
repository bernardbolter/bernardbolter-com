import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { getStudioUser } from '@/lib/studio/auth'

import { LoginForm } from './LoginForm'
import './login.css'

type Props = {
  searchParams: Promise<{ from?: string }>
}

function studioDestination(from: string | undefined): string {
  const trimmed = from?.trim()
  if (!trimmed || !trimmed.startsWith('/studio')) return '/studio'
  return trimmed
}

export default async function StudioLoginPage({ searchParams }: Props) {
  const user = await getStudioUser()
  const { from } = await searchParams
  const destination = studioDestination(from)

  if (user) {
    redirect(destination)
  }

  return (
    <main className="studio-login">
      <section className="studio-login__card">
        <h1>Studio Login</h1>
        <p>Sign in with your Payload account to access private studio tools.</p>
        <Suspense fallback={null}>
          <LoginForm destination={destination} />
        </Suspense>
      </section>
    </main>
  )
}

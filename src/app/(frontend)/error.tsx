'use client'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function FrontendError({ reset }: Props) {
  return (
    <main className="min-h-screen bg-[var(--surface-page)] px-[10%] py-[9.375rem] font-body text-sm text-secondary">
      <h1 className="mb-4 font-heading text-2xl text-primary">Temporarily unavailable</h1>
      <p className="mb-6 max-w-xl leading-relaxed">
        The archive could not reach the database. If you are the site owner, check that{' '}
        <code>DATABASE_URL</code> is set and the database is within its quota.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded border border-[var(--ui-line)] bg-white px-4 py-2 font-heading text-sm text-primary"
      >
        Try again
      </button>
    </main>
  )
}

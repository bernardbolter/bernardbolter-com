import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'

import { StudioAdminLinks } from '@/components/studio/StudioAdminLinks'
import { StudioLogoutButton } from '@/components/studio/StudioLogoutButton'
import { TabBar } from '@/components/studio/TabBar'
import { getStudioUser } from '@/lib/studio/auth'

// Studio routes always need auth + DB at request time, not during build.
export const dynamic = 'force-dynamic'

export default async function StudioAppLayout({ children }: { children: ReactNode }) {
  const user = await getStudioUser()
  if (!user) {
    const path = (await nextHeaders()).get('x-studio-path') ?? '/studio'
    redirect(`/studio/login?from=${encodeURIComponent(path)}`)
  }

  return (
    <div className="studio-shell">
      <header className="studio-shell__header">
        <h1 className="studio-shell__title">Studio</h1>
        <div className="studio-shell__header-actions">
          <StudioAdminLinks />
          <StudioLogoutButton />
        </div>
      </header>
      <Suspense fallback={<nav className="studio-nav" aria-label="Studio sections" />}>
        <TabBar />
      </Suspense>
      <main className="studio-shell__main">{children}</main>
    </div>
  )
}

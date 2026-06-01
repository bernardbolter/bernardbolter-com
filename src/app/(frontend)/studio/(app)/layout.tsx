import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { StudioAdminLinks } from '@/components/studio/StudioAdminLinks'
import { StudioLogoutButton } from '@/components/studio/StudioLogoutButton'
import { TabBar } from '@/components/studio/TabBar'
import { getStudioUser } from '@/lib/studio/auth'

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
      <TabBar />
      <main className="studio-shell__main">{children}</main>
    </div>
  )
}

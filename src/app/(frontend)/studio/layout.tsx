import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { TabBar } from '@/components/studio/TabBar'
import '@/components/studio/studio.scss'
import { getStudioUser } from '@/lib/studio/auth'

export default async function StudioLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getStudioUser()
  if (!user) redirect('/studio/login')

  return (
    <div className="studio-shell">
      <header className="studio-shell__header">
        <h1 className="studio-shell__title">Studio</h1>
      </header>
      <TabBar />
      <main className="studio-shell__main">{children}</main>
    </div>
  )
}

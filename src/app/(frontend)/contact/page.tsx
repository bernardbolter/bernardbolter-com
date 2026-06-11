import type { Metadata } from 'next'

import Contact from '@/components/contact/Contact'
import { getArtistForContactPage } from '@/lib/payload/contactPage'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact Bernard Bolter for studio and artwork inquiries.',
  alternates: { canonical: '/contact' },
}

export default async function ContactPage() {
  const artist = await getArtistForContactPage()

  if (!artist) {
    return (
      <main className="min-h-screen bg-[var(--surface-page)] px-[10%] py-[9.375rem] font-body text-sm text-secondary">
        Contact information is being prepared.
      </main>
    )
  }

  return <Contact artist={artist} />
}

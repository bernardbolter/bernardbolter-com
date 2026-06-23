import type { Metadata } from 'next'

import Contact from '@/components/contact/Contact'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getArtistForContactPage } from '@/lib/payload/contactPage'
import { generateContactPageJsonLd } from '@/utilities/generateContactPageJsonLd'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact Bernard Bolter for studio and artwork inquiries.',
  alternates: { canonical: '/contact' },
}

export default async function ContactPage() {
  const artist = await getArtistForContactPage()
  const jsonLd = artist ? generateContactPageJsonLd(artist, { baseUrl: getSiteBaseUrl() }) : null

  return (
    <div className="bio-page__container">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {artist ? (
        <Contact artist={artist} />
      ) : (
        <main className="min-h-screen bg-[var(--surface-page)] px-[10%] py-[9.375rem] font-body text-sm text-secondary">
          Contact information is being prepared.
        </main>
      )}
    </div>
  )
}

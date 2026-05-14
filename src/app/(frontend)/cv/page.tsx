import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'

import { buildCvSections } from '@/lib/cv/buildCvSections'
import { getCvEvents } from '@/lib/payload/cvEvents'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Curriculum vitae',
  description: 'Education, exhibitions, publications, awards, and professional activities.',
  alternates: { canonical: '/cv' },
}

export default async function CvPage() {
  const payload = await getPayload({ config })
  const artistRes = await payload.find({
    collection: 'artists',
    locale: 'en',
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })
  const artist = artistRes.docs[0] ?? null

  const events = await getCvEvents()
  const sections = buildCvSections(events, artist)

  return (
    <main style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
      <h1 style={{ fontFamily: 'var(--font-staatliches), sans-serif', fontSize: '2rem', marginBottom: '1.5rem' }}>
        Curriculum vitae
      </h1>
      {sections.length === 0 ?
        <p style={{ opacity: 0.8 }}>No published CV entries yet.</p>
      : sections.map((section) => (
          <section key={section.slug} style={{ marginBottom: '2.25rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-barlow-condensed), sans-serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '0.75rem',
                letterSpacing: '0.02em',
              }}
            >
              {section.heading}
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {section.items.map((item) => (
                <li
                  key={item.id}
                  style={{
                    fontFamily: 'var(--font-barlow), sans-serif',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid color-mix(in srgb, currentColor 8%, transparent)',
                    marginBottom: '0.5rem',
                  }}
                >
                  {item.text}
                </li>
              ))}
            </ul>
          </section>
        ))
      }
    </main>
  )
}

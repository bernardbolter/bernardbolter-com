import type { Metadata } from 'next'

import ContactPage from '@/components/contact/ContactPage'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact Bernard Bolter for studio and artwork inquiries.',
  alternates: { canonical: '/contact' },
}

export default function ContactRoutePage() {
  return <ContactPage />
}

import Link from 'next/link'

import { CreatePaintingForm } from '@/components/studio/CreatePaintingForm'

export default function NewPaintingPage() {
  return (
    <section>
      <header className="studio-page-header">
        <h2>New painting</h2>
        <Link href="/studio/paintings" className="studio-page-header__link">
          ← Back
        </Link>
      </header>
      <CreatePaintingForm />
    </section>
  )
}

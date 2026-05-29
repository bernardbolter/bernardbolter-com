import Link from 'next/link'

import { CreateEpisodeForm } from '@/components/studio/CreateEpisodeForm'

export default function NewEpisodePage() {
  return (
    <section>
      <header className="studio-page-header">
        <h2>New episode</h2>
        <Link href="/studio/episodes" className="studio-page-header__link">
          ← Back
        </Link>
      </header>
      <CreateEpisodeForm />
    </section>
  )
}

import type { Metadata } from 'next'

import HomePage from '@/components/home/HomePage'
import { CorpusArchiveIntro } from '@/components/seo/CorpusArchiveIntro'
import { CorpusDiscoveryLink } from '@/components/seo/CorpusDiscoveryLink'
import { corpusAlternateTypes, corpusIndexUrl } from '@/lib/seo/corpusDiscovery'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
    ...corpusAlternateTypes(corpusIndexUrl()),
  },
}

export default function Page() {
  return (
    <>
      {/* Optically hidden early instance — keep for truncating fetchers */}
      <CorpusDiscoveryLink />
      <HomePage>
        {/* Visible instance inside <main>, outside nav/header/footer */}
        <CorpusArchiveIntro />
      </HomePage>
    </>
  )
}

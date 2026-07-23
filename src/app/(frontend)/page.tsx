import type { Metadata } from 'next'

import HomePage from '@/components/home/HomePage'
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
      <HomePage />
      <CorpusDiscoveryLink />
    </>
  )
}

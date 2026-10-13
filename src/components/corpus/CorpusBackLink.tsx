'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { readCorpusFiltersHref } from '@/components/corpus/CorpusFiltersPersist'

/** Plain link back to /corpus (restores last filter query when present). */
export default function CorpusBackLink() {
  const [corpusHref, setCorpusHref] = useState('/corpus')

  useEffect(() => {
    setCorpusHref(readCorpusFiltersHref())
  }, [])

  return (
    <p className="corpus-back-link">
      <Link href={corpusHref} className="corpus-back-link__a">
        Corpus
      </Link>
    </p>
  )
}

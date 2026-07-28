'use client'

import Link from 'next/link'

import { clearCorpusFiltersPersist } from '@/components/corpus/CorpusFiltersPersist'

/** Clear button that also drops persisted corpus filters. */
export default function CorpusFiltersClearLink() {
  return (
    <Link
      href="/corpus"
      className="bio__inline-link"
      onClick={() => clearCorpusFiltersPersist()}
    >
      Clear
    </Link>
  )
}

import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getPerson } from '@/lib/payload/person'
import HomePage from '@/components/home/HomePage'
import { buildHomeJsonLd } from '@/utilities/buildHomeJsonLd'

export default async function Page() {
  const artist = await getPerson()
  const jsonLd = buildHomeJsonLd(artist, { baseUrl: getSiteBaseUrl() })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePage />
    </>
  )
}

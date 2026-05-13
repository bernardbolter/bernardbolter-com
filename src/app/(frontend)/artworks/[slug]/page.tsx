import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildArtworkJsonLd } from '@/lib/jsonld/artwork'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getArtistGlobal, getPublishedArtworkBySlug } from '@/lib/payload/siteDocuments'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const artwork = await getPublishedArtworkBySlug(slug)
  if (!artwork) {
    return { title: 'Artwork' }
  }
  const base = getSiteBaseUrl()
  return {
    title: artwork.title,
    description: artwork.descriptionShort ?? undefined,
    alternates: { canonical: `${base}/artworks/${slug}` },
  }
}

export default async function ArtworkJsonLdPage({ params }: Props) {
  const { slug } = await params
  const [artwork, artist] = await Promise.all([getPublishedArtworkBySlug(slug), getArtistGlobal()])
  if (!artwork) notFound()

  const jsonLd = buildArtworkJsonLd(artwork, artist)

  const base = getSiteBaseUrl()
  const arUrl = typeof artwork.arModelUrl === 'string' ? artwork.arModelUrl : null
  const previewUrl =
    typeof artwork.primaryImage === 'object' && artwork.primaryImage && 'url' in artwork.primaryImage ?
      String(artwork.primaryImage.url)
    : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {arUrl && previewUrl ?
        <p>
          <a
            rel="ar"
            href={`${arUrl}#allowsContentScaling=${artwork.arAllowScaling === false ? 0 : 1}&canonicalWebPageURL=${encodeURIComponent(`${base}/artworks/${slug}`)}`}
          >
            <img
              src={previewUrl}
              alt="View in AR"
              width={600}
              height={600}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </a>
        </p>
      : null}
      <main>
        <h1>{artwork.title}</h1>
      </main>
    </>
  )
}

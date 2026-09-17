import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import ArtworkPage from '@/components/artwork/ArtworkPage'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { getArtworkImageFallbackUrl } from '@/helpers/artworkCatalog'
import { isReservedFrontendSlug } from '@/lib/routes/reservedFrontendSlugs'
import { resolveArtworkMenuPlusColor } from '@/lib/artwork/artworkMenuPlusColor'
import { resolveArtworkSeo } from '@/lib/artwork/seo'
import { ArtworkPageChromeProvider } from '@/providers/ArtworkPageChromeContext'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { buildArtworkJsonLd } from '@/lib/jsonld/artwork'
import { getArtworkForPage } from '@/lib/payload/artworkPage'
import { getArtistRecord } from '@/lib/payload/siteDocuments'
import { corpusAlternateTypes, corpusRecordUrl } from '@/lib/seo/corpusDiscovery'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (isReservedFrontendSlug(slug)) {
    return { title: 'Not found' }
  }
  const artwork = await getArtworkForPage(slug)
  if (!artwork) {
    return { title: 'Artwork not found' }
  }

  const base = getSiteBaseUrl()
  const seo = resolveArtworkSeo(artwork)
  const imageUrl = getArtworkImageFallbackUrl(artwork)
  const canonical = `${base}/${slug}`
  const ogImages = imageUrl ? [{ url: imageUrl.startsWith('http') ? imageUrl : `${base}${imageUrl}` }] : undefined

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
      ...corpusAlternateTypes(corpusRecordUrl(slug, base)),
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      type: 'website',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: ogImages?.map((image) => image.url),
    },
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  if (isReservedFrontendSlug(slug)) notFound()

  const [artwork, artist] = await Promise.all([
    getArtworkForPage(slug),
    getArtistRecord(),
  ])
  if (!artwork) notFound()

  const imageUrl = getArtworkImageFallbackUrl(artwork)
  const jsonLd = buildArtworkJsonLd(artwork, artist)

  return (
    <>
      <JsonLdScript data={jsonLd} />
      {imageUrl ? <link rel="image" href={imageUrl} /> : null}
      <ArtworkPageChromeProvider menuPlusColor={resolveArtworkMenuPlusColor(artwork)}>
        <div className="artwork-page__layout">
          <ArtworkPage artwork={artwork} artist={artist} />
        </div>
      </ArtworkPageChromeProvider>
    </>
  )
}

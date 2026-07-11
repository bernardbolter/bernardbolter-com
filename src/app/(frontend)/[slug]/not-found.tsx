import type { Metadata } from 'next'
import Link from 'next/link'

import ArtworkR2Image from '@/components/artwork/ArtworkR2Image'
import {
  artworkHasDisplayImage,
  getArtworkImagePair,
  getPrimaryMediaDimensions,
} from '@/helpers/artworkCatalog'
import { getRandomPublishedArtwork } from '@/lib/payload/siteDocuments'

export const metadata: Metadata = {
  title: 'Artwork not found',
  description: 'This artwork could not be found in the archive.',
  robots: { index: false, follow: true },
}

const linkClassName =
  'block py-[0.3125rem] font-body text-sm font-extralight text-dark no-underline before:mr-2 before:inline-block before:translate-y-px before:content-["»"] hover:underline'

export default async function ArtworkNotFound() {
  const randomArtwork = await getRandomPublishedArtwork()
  const imagePair = randomArtwork ? getArtworkImagePair(randomArtwork, 'grid') : null
  const showArtwork = Boolean(randomArtwork && imagePair && artworkHasDisplayImage(randomArtwork))

  let imageWidth = 500
  let imageHeight = 500
  if (randomArtwork) {
    const dimensions = getPrimaryMediaDimensions(randomArtwork)
    imageWidth = dimensions.width
    imageHeight = dimensions.height
  }

  return (
    <>
      <section className="mx-auto flex w-[90%] flex-col items-center justify-center bg-surface-page px-[5%] pb-space-2 pt-[7.1875rem]">
        <h1 className="pb-[0.4375rem] font-heading text-[1.375rem] font-semibold tracking-wide text-dark">
          Artwork not found
        </h1>
        <p className="max-w-[28.125rem] w-full font-body text-[0.9375rem] font-light leading-relaxed text-secondary">
          This work is not in the published archive — it may be unpublished, archived, or the link
          may be incorrect.
        </p>

        <div className="mt-[0.4375rem] flex w-full max-w-[21.875rem] flex-col items-start p-[0.4375rem]">
          <Link href="/" className={linkClassName}>
            Return to the Art Timeline
          </Link>
          <div className="my-space-1 h-px w-full bg-border" />
          <Link href="/bio" className={linkClassName}>
            About the Artist
          </Link>
          <Link href="/contact" className={linkClassName}>
            Contact
          </Link>
        </div>

        {showArtwork && randomArtwork && imagePair ? (
          <>
            <div className="my-space-1 h-px w-full max-w-[25rem] bg-border" />
            <div className="flex w-full max-w-[25rem] flex-col items-start">
              <p className="py-[0.125rem] font-body text-[0.8125rem] font-extralight text-secondary">
                While you&apos;re here, explore this piece:
              </p>
              <h2 className="px-[0.3125rem] py-[0.125rem] font-heading text-[1.0625rem] font-extralight tracking-wide text-dark">
                {randomArtwork.title}
              </h2>
              <Link href={`/${randomArtwork.slug}`} className="block w-full">
                <ArtworkR2Image
                  src={imagePair.src}
                  fallbackSrc={imagePair.fallback}
                  alt={randomArtwork.title ?? 'Artwork'}
                  width={imageWidth}
                  height={imageHeight}
                  className="h-auto w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </Link>
            </div>
          </>
        ) : null}
      </section>
    </>
  )
}

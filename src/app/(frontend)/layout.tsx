// app/layout.tsx
import type { Metadata } from 'next'
import { Barlow, Barlow_Condensed, Staatliches } from 'next/font/google'

import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { RouteStructuredData } from '@/components/seo/RouteStructuredData'
import { SiteChrome } from '@/components/site/SiteChrome'
import { ArtworkChromeProvider } from '@/providers/ArtworkChromeProvider'
import { artistAsSchemaPerson } from '@/lib/jsonld/artistPerson'
import { getRootChromeData } from '@/lib/payload/layoutData'
import { getSiteBaseUrl } from '@/lib/jsonld/site'

import AnimationWrapper from './AnimationWrapper'
import './global.css'

const siteBaseUrl = getSiteBaseUrl()

const barlow = Barlow({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-barlow',          // <-- CSS variable
});

const barlowCondensed = Barlow_Condensed({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-barlow-condensed'
});

const staatliches = Staatliches({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-staatliches',
});

export const metadata: Metadata = {
  title: {
    default: "Bernard Bolter's Web Portal",
    template: "%s | Bernard Bolter",
  },
  description:
    "Explore Bernard Bolter's cityscape artworks: a timeline of paintings, drawings, and mixed media from 1992 to present. Original art for sale and exhibitions.",
  keywords: [
    'Bernard Bolter',
    'digital art',
    'mixed media art',
    'contemporary painting',
    'artist portfolio',
    'original artwork',
    'San Francisco artist',
    'cityscape art',
  ],
  metadataBase: new URL(siteBaseUrl),
  // Page-specific og:title / og:description / og:url / twitter:* belong on each
  // route via buildPageMetadata — do not hardcode homepage values here or they
  // freeze across every child page that only sets `description`.
  openGraph: {
    siteName: 'Bernard Bolter Art',
    images: [
      {
        url: '/bernard-bolter-portrait.jpeg',
        width: 811,
        height: 539,
        alt: 'Bernard Bolter Cityscape Artwork',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/bernard-bolter-portrait.jpeg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { person, artistInfo, seriesSlugByArtworkSlug, archiveMedianAreaMm2 } = await getRootChromeData()
  const personLd = artistAsSchemaPerson(person ?? ({ name: 'Bernard Bolter' } as never))

  return (
    <html lang="en">
      <head>
        <JsonLdScript
          data={{
            '@context': 'https://schema.org',
            ...personLd,
            '@id': `${siteBaseUrl}/bio#person`,
            url: siteBaseUrl,
          }}
        />
        <RouteStructuredData />
      </head>
      <body
        className={`
          ${barlow.variable}
          ${barlowCondensed.variable}
          ${staatliches.variable}
          ${barlow.className}
        `}
      >
          <ArtworkChromeProvider
            artist={artistInfo}
            seriesSlugByArtworkSlug={seriesSlugByArtworkSlug}
            archiveMedianAreaMm2={archiveMedianAreaMm2}
          >
            <SiteChrome />
            <AnimationWrapper>
              {children}
            </AnimationWrapper>
          </ArtworkChromeProvider>
      </body>
    </html>
  );
}

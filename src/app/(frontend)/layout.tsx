// app/layout.tsx
import type { Metadata } from 'next'
import { Barlow, Barlow_Condensed, Staatliches } from 'next/font/google'

import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { RouteStructuredData } from '@/components/seo/RouteStructuredData'
import { SiteChrome } from '@/components/site/SiteChrome'
import ArtworksProvider from '@/providers/ArtworkProvider'
import { getLayoutProviderData } from '@/lib/payload/layoutData'
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
  description: "Explore Bernard Bolter's cityscape artworks: a timeline of paintings, drawings, and mixed media from 1992 to present. Original art for sale and exhibitions.",
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
  alternates: { canonical: '/' },
  openGraph: {
    title: "Bernard Bolter's Art Portfolio",
    description: 'Timeline of cityscape artworks by Bernard Bolter.',
    url: siteBaseUrl,
    siteName: 'Bernard Bolter Art',
    images: [{ url: '/bernard-bolter-portrait.jpeg', width: 811, height: 539, alt: 'Bernard Bolter Cityscape Artwork' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Bernard Bolter's Art Portfolio",
    description: "Explore abstract artworks from 1980 to present.",
    images: ['/bernard-bolter-portrait.jpeg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  verification: {
    google: 'YOUR_GOOGLE_SITE_VERIFICATION_CODE', // From Google Search Console
  },
};

export const revalidate = 3600;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { artworks: artworksData, artistInfo, filterSeries } = await getLayoutProviderData()

  return (
    <html lang="en">
      <head>
        <JsonLdScript
          data={{
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Bernard Bolter',
            jobTitle: 'Mixed Media and Digital Artist',
            url: siteBaseUrl,
            description: 'San Francisco born, Berlin based, mixed media and digital artist.',
            image: `${siteBaseUrl}/bernard-bolter-portrait.jpeg`,
            sameAs: ['https://instagram.com/bernardbolter'],
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
          <ArtworksProvider artworks={artworksData} artist={artistInfo} filterSeries={filterSeries}>
            <SiteChrome />
            <AnimationWrapper>
              {children}
            </AnimationWrapper>
          </ArtworksProvider>
      </body>
    </html>
  );
}
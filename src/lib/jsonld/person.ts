// lib/jsonld/person.ts
import type { Person } from '@/payload-types'   // Payload names it from the slug

export function personJsonLd(person: Person, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${baseUrl}/#person`,
    name: person.name,
    url: person.primaryUrl ?? baseUrl,
    jobTitle: person.jobTitle,
    image: typeof person.portrait === 'object' ? person.portrait?.url : undefined,
    description: person.shortBio,

    birthDate: person.birthDate,
    birthPlace: person.birthPlace?.city ? {
      '@type': 'Place',
      name: person.birthPlace.city,
      address: {
        '@type': 'PostalAddress',
        addressLocality: person.birthPlace.city,
        addressRegion:   person.birthPlace.region,
        addressCountry:  person.birthPlace.countryCode,
      },
    } : undefined,

    workLocation: person.workLocations?.map((loc) => ({
      '@type': 'Place',
      name: loc.city,
      address: {
        '@type': 'PostalAddress',
        addressLocality: loc.city,
        addressCountry:  loc.countryCode,
      },
    })),

    knowsLanguage: person.knowsLanguage?.map((l) => l.language),

    alumniOf: person.alumniOf?.map((edu) => ({
      '@type': 'EducationalOrganization',
      name: edu.institution,
      url:  edu.url,
    })),

    affiliation: person.affiliation?.map((aff) => ({
      '@type': 'Organization',
      name: aff.organization,
      url:  aff.url,
    })),

    award: person.award?.map((a) => a.name),

    sameAs: person.authorityLinks?.map((l) => l.url),

    subjectOf: person.ownSites?.map((site) => ({
      '@type': 'WebSite',
      name: site.name,
      url:  site.url,
    })),
  }
}
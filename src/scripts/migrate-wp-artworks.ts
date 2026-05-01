import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

// Your WP GraphQL endpoint
const WP_ENDPOINT = 'https://artism.org/bolter/graphql'

const ImageFields = `
  node {
    altText
    sourceUrl(size: _1536X1536)
    srcSet(size: _1536X1536)
    mediaDetails {
      width
      height
    }
  }
`

const WP_QUERY = `
  query getAllArtwork {
    allArtwork(first: 500) {
      nodes {
        id
        title(format: RENDERED)
        slug
        artworkFields {
          area
          artworkImage { ${ImageFields} }
          artworklink {
            target
            title
            url
          }
          city
          coordinates
          country
          dcsFlags { ${ImageFields} }
          dcsPhoto { ${ImageFields} }
          dcsPhotoTitle
          dcsRaw { ${ImageFields} }
          dcsSatellite { ${ImageFields} }
          density
          elevation
          exhibitionHistory
          extraimages
          location
          forsale
          price
          provenance
          printEditions
          height
          lat
          lng
          medium
          metadescription
          metakeywords
          orientation
          performance
          population
          proportion
          series
          size
          slug
          style
          units
          width
          year
          artworkImage2 { ${ImageFields} } 
          artworkImage3 { ${ImageFields} }
          artworkImage4 { ${ImageFields} }
          artworkImage5 { ${ImageFields} }
          artworkImage6 { ${ImageFields} }
          artworkImage7 { ${ImageFields} }
          artworkImage8 { ${ImageFields} }
          artworkImage9 { ${ImageFields} }
          hasMoreImages
          video {
            node {
              altText
              mediaDetails {
                height
                width
              }
              sourceUrl(size: LARGE)
              uri
            }
          }
          videoPoster { ${ImageFields} }
          videoYouttubeLink
        }
        date
        dateGmt
        databaseId
        colorfulFields {
          storyEn
          wikiLinkEn
          ar
        }
      }
    }
    biography(id: "cG9zdDo1NzQ=") {
      content(format: RENDERED)
      bio {
        tagline
        bioimage1 { ${ImageFields} }
        bioimage2 { ${ImageFields} }
        bioimage3 { ${ImageFields} }
        bioimage4 { ${ImageFields} }
        bioimage5 { ${ImageFields} }
        bioimage6 { ${ImageFields} }
        bioimage7 { ${ImageFields} }
        bioimage8 { ${ImageFields} }
        bioimage9 { ${ImageFields} }
        bioimage10 { ${ImageFields} }
      } 
    }
    artistInfo(id: "cG9zdDozNQ==") {
      id
      artistData {
        birthcity
        birthyear
        fieldGroupName
        link1 {
          target
          title
          url
        }
        link2 {
          target
          title
          url
        }
        link3 {
          target
          title
          url
        }
        link4 {
          target
          title
          url
        }
        link5 {
          target
          title
          url
        }
        name
        workcity1
        workcity2
        workcity3
      }
    }
    cvinfos(first: 500) {
      nodes {
        cvInfoFields {
          city
          gallery
          role
          school
          section
          title
          year
        }
      }
    }
    page(id: "cG9zdDo2MTc=") {
      content(format: RENDERED)
    }
    contact: page(id: "cG9zdDo2MjA=") { 
      content(format: RENDERED)
    }
    datenschutz: page(id: "cG9zdDo2Mjk=") { 
      content(format: RENDERED)
    }
  }
`

async function migrate() {
  try {
    const payload = await getPayload({ config })

    // 1. Fetch all WP artworks
    console.log('Fetching from WordPress...')
    const res = await fetch(WP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: WP_QUERY }),
    })

    if (!res.ok) {
      throw new Error(`WordPress request failed: ${res.statusText}`)
    }

    const json = await res.json()

    if (json.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`)
    }

    const wpArtworks = json.data?.allArtwork?.nodes || []
    console.log(`Found ${wpArtworks.length} artworks`)

    // 2. Get your artist person ID
    const people = await payload.find({
      collection: 'people',
      where: { role: { contains: 'artist' } },
      limit: 1,
    })

    const artistId = people.docs[0]?.id
    if (!artistId) {
      throw new Error('No artist found in People collection')
    }

    console.log(`Using artist ID: ${artistId}`)

    // 3. Get series IDs mapped by slug
    const seriesResult = await payload.find({
      collection: 'series',
      limit: 50,
    })

    const seriesMap: Record<string, string> = {}
    seriesResult.docs.forEach((s) => {
      seriesMap[s.slug] = s.id
    })

    console.log('Series map:', seriesMap)

    // 4. Migrate each artwork
    let created = 0
    let skipped = 0
    let errors = 0

    for (const wp of wpArtworks) {
      const f = wp.artworkFields || {}
      const wpId = wp.databaseId != null ? Number(wp.databaseId) : Number.parseInt(wp.id, 10)

      if (Number.isNaN(wpId)) {
        console.log(`⊘ Skipping ${wp.slug} — invalid WP id`)
        skipped++
        continue
      }

      try {
        // Try to find existing artwork by wp_id OR slug
        let existing = await payload.find({
          collection: 'artworks',
          where: { wp_id: { equals: wpId } },
          limit: 1,
        })

        // If not found by wp_id, try by slug
        if (existing.docs.length === 0) {
          existing = await payload.find({
            collection: 'artworks',
            where: { slug: { equals: wp.slug } },
            limit: 1,
          })
        }

        // If artwork exists, UPDATE it with wpImageUrl
        if (existing.docs.length > 0) {
          const existingId = existing.docs[0].id
          const wpImageUrl = f.artworkImage?.node?.sourceUrl ?? null

          await payload.update({
            collection: 'artworks',
            id: existingId,
            data: {
              wpImageUrl,
              // Also ensure wp_id is set for future migrations
              wp_id: wpId,
            },
          })

          console.log(`↻ Updated: ${wp.slug} with wpImageUrl`)
          created++
          continue
        }

        // Map series slug to Payload series ID
        const seriesSlug = f.series?.[0] ?? null
        const seriesId = seriesSlug ? seriesMap[seriesSlug] : null

        // Build dateCreated from year field
        const dateCreated = f.year
          ? new Date(`${f.year}-01-01`).toISOString().split('T')[0]
          : wp.date
            ? new Date(wp.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]

        // Map units
        const unitCode = f.units === 'metric' ? 'CMT' : 'INH'

        // Map artform (set a sensible default or extract from WP if available)
        const artform = 'Painting' // TODO: map from WP data if available

        await payload.create({
          collection: 'artworks',
          data: {
            // Core
            name: wp.title,
            slug: wp.slug,
            creator: artistId,
            series: seriesId ?? null,
            seriesSlug: seriesSlug ?? null,
            status: 'published',
            dateCreated,
            wp_id: wpId,

            // Artwork details
            artform,
            artMedium: f.medium ?? null,
            orientation: f.orientation?.[0] ?? null,
            dimensions: {
              width: f.width ? parseFloat(f.width) : null,
              height: f.height ? parseFloat(f.height) : null,
              depth: null,
              unitCode,
            },

            // Description
            description: f.colorfulFields?.storyEn ?? null,

            // Location created
            locationCreated: {
              label: f.location ?? null,
              city: f.city ?? null,
              country: f.country ?? null,
              countryCode: null,
              lat: f.lat ? parseFloat(f.lat) : null,
              lng: f.lng ? parseFloat(f.lng) : null,
            },

            // Commerce
            isForSale: f.forsale ?? false,

            // Provenance
            provenanceNotes: f.provenance ?? null,

            // Legacy WP link only
            oldWpUrl: f.artworklink?.url ?? null,

            // Temporary WP image URL until migrated to R2
            wpImageUrl: f.artworkImage?.node?.sourceUrl ?? null,
          },
        })

        console.log(`✓ Created: ${wp.slug}`)
        created++
      } catch (err) {
        console.error(`✗ Error on ${wp.slug}:`, err instanceof Error ? err.message : err)
        errors++
      }
    }

    console.log(
      `\n✓ Migration complete. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`,
    )
    process.exit(errors > 0 ? 1 : 0)
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

migrate()

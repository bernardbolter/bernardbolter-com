import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
/** @deprecated Legacy `--schema=legacy` removed — Artworks Step 6+ shape only. */
if (args.has('--schema=legacy')) {
  console.warn('Ignoring --schema=legacy: WP import targets Step 6 Artworks fields only.')
}

function inferMediumFromWp(mediumText: string | null | undefined): string {
  const m = (mediumText ?? '').toLowerCase()
  if (m.includes('collage')) return 'photo-collage'
  if (m.includes('video') || m.includes('mp4')) return 'video'
  if (m.includes('digital')) return 'digital'
  if (m.includes('transfer')) return 'acrylic-photo-transfer-on-canvas'
  if (m.includes('mixed')) return 'mixed-media-on-canvas'
  return 'acrylic-on-canvas'
}

function inferMeasurementTypes(f: {
  video?: { node?: { sourceUrl?: string | null } | null } | null
  performance?: string | null
}): string[] {
  const types = new Set<string>(['physical'])
  if (f.video?.node?.sourceUrl) types.add('time-based')
  if (f.performance) types.add('time-based')
  return [...types]
}

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
    console.log(dryRun ? 'migrate-wp-artworks (dry-run)' : 'migrate-wp-artworks (live)')

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

    // 2. Primary artist row (single-tenant)
    const artists = await payload.find({
      collection: 'artists',
      limit: 1,
    })

    const artistId = artists.docs[0]?.id
    if (!artistId) {
      throw new Error('No artist found in artists collection')
    }

    console.log(`Using artist ID: ${artistId}`)

    // 3. Get series IDs mapped by slug
    const seriesResult = await payload.find({
      collection: 'series',
      limit: 50,
    })

    const seriesMap: Record<string, number> = {}
    seriesResult.docs.forEach((s) => {
      seriesMap[s.slug] = Number(s.id)
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

        // If artwork exists, UPDATE it with WP image url only
        if (existing.docs.length > 0) {
          const existingId = existing.docs[0].id
          const wpImageUrl = f.artworkImage?.node?.sourceUrl ?? null

          const updateData: Record<string, unknown> = {
            wpImageUrl,
            wp_id: wpId,
          }

          if (dryRun) {
            console.log(`[dry-run] update artworks/${existingId}`, updateData)
          } else {
            await payload.update({
              collection: 'artworks',
              id: existingId,
              data: updateData as any,
            })
          }

          console.log(`↻ Updated: ${wp.slug} with wpImageUrl`)
          created++
          continue
        }

        // Map series slug to Payload series ID
        const seriesSlug = f.series?.[0] ?? null
        const seriesId = seriesSlug ? seriesMap[seriesSlug] : null

        const fallbackDate = wp.date ? new Date(wp.date) : new Date()
        const parsedYear = Number.parseInt(String(f.year ?? ''), 10)
        const yearCreated = Number.isNaN(parsedYear) ? fallbackDate.getUTCFullYear() : parsedYear

        const unitCode = f.units === 'metric' ? 'CMT' : 'INH'
        const width = f.width ? parseFloat(f.width) : null
        const height = f.height ? parseFloat(f.height) : null

        const medium = inferMediumFromWp(f.medium ?? null)

        const commonData: Record<string, unknown> = {
          slug: wp.slug,
          creator: artistId,
          series: seriesId ?? null,
          seriesSlug: seriesSlug ?? null,
          status: 'published',
          wp_id: wpId,
          orientation: f.orientation?.[0] ?? null,
          description: f.colorfulFields?.storyEn ?? null,
          locationCreated: {
            label: f.location ?? null,
            city: f.city ?? null,
            country: f.country ?? null,
            countryCode: null,
            lat: f.lat ? parseFloat(f.lat) : null,
            lng: f.lng ? parseFloat(f.lng) : null,
          },
          isForSale: f.forsale ?? false,
          provenanceNotes: f.provenance ?? null,
          oldWpUrl: f.artworklink?.url ?? null,
          wpImageUrl: f.artworkImage?.node?.sourceUrl ?? null,
        }

        const data: Record<string, unknown> = {
          ...commonData,
          title: wp.title,
          yearCreated,
          medium,
          measurementType: inferMeasurementTypes(f),
          support: 'canvas',
          widthWhole: width == null ? null : Math.floor(width),
          widthFraction: null,
          heightWhole: height == null ? null : Math.floor(height),
          heightFraction: null,
          depthWhole: null,
          depthFraction: null,
          dimensionUnit: unitCode === 'INH' ? 'in' : 'cm',
        }

        if (dryRun) {
          console.log(`[dry-run] create artworks/${wp.slug}`, data)
        } else {
          await payload.create({
            collection: 'artworks',
            data: data as any,
          })
        }

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

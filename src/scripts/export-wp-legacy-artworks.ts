/**
 * One-time export: fetch all artworks from artism.org/bolter GraphQL and write
 * raw nodes to data/legacy/wp-artworks.json (no normalisation at export time).
 *
 * Usage: npx tsx src/scripts/export-wp-legacy-artworks.ts
 */
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const WP_ENDPOINT = 'https://artism.org/bolter/graphql'
const PAGE_SIZE = 100

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const OUT_PATH = path.resolve(dirname, '../../data/legacy/wp-artworks.json')

const ARTWORK_NODE_FIELDS = `
  databaseId
  slug
  title
  date
  uri
  featuredImage {
    node {
      sourceUrl
    }
  }
  categories {
    nodes {
      name
      slug
    }
  }
  artworkFields {
    year
    city
    country
    lat
    lng
    location
    medium
    units
    width
    height
    size
    orientation
    series
    style
    exhibitionHistory
    provenance
    printEditions
    forsale
    price
    proportion
    area
    coordinates
    density
    elevation
    population
    dcsPhotoTitle
    artworkImage {
      node {
        sourceUrl
      }
    }
  }
`

type PageResult = {
  data?: {
    allArtwork?: {
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null }
      nodes?: unknown[]
    }
  }
  errors?: Array<{ message?: string }>
}

async function fetchPage(after: string | null): Promise<PageResult> {
  const query = `
    query ExportLegacyArtworks($first: Int!, $after: String) {
      allArtwork(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ${ARTWORK_NODE_FIELDS}
        }
      }
    }
  `

  const res = await fetch(WP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { first: PAGE_SIZE, after },
    }),
  })

  if (!res.ok) {
    throw new Error(`WP GraphQL HTTP ${res.status}`)
  }

  return (await res.json()) as PageResult
}

async function main() {
  console.log('Exporting legacy WP artworks →', OUT_PATH)

  const allNodes: unknown[] = []
  let after: string | null = null
  let page = 0

  while (true) {
    page += 1
    console.log(`Fetching page ${page}${after ? ` (after ${after.slice(0, 12)}…)` : ''}…`)

    const result = await fetchPage(after)
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join('; '))
    }

    const connection = result.data?.allArtwork
    const nodes = connection?.nodes ?? []
    allNodes.push(...nodes)
    console.log(`  +${nodes.length} (total ${allNodes.length})`)

    if (!connection?.pageInfo?.hasNextPage) break
    after = connection.pageInfo.endCursor ?? null
    if (!after) break
  }

  mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, `${JSON.stringify(allNodes, null, 2)}\n`, 'utf8')

  const withFeatured = allNodes.filter((node) => {
    const n = node as {
      featuredImage?: { node?: { sourceUrl?: string } }
      artworkFields?: { artworkImage?: { node?: { sourceUrl?: string } } }
    }
    return Boolean(
      n.featuredImage?.node?.sourceUrl ?? n.artworkFields?.artworkImage?.node?.sourceUrl,
    )
  }).length

  console.log(`Done. ${allNodes.length} records written. ${withFeatured} with image URL.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

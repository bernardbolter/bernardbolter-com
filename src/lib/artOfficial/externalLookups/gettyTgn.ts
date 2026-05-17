export type GettyTgnHit = {
  uri: string
  label: string
}

/**
 * Search Getty TGN (Thesaurus of Geographic Names) via the public SPARQL endpoint.
 */
export async function searchGettyTgn(
  placeName: string,
  limit = 5,
): Promise<GettyTgnHit[] | { error: string }> {
  const term = placeName.trim()
  if (!term) return { error: 'placeName is required' }

  const safe = term.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const query = `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?uri ?label WHERE {
  ?uri skos:prefLabel ?label .
  FILTER(LANG(?label) = "en")
  FILTER(CONTAINS(LCASE(STR(?label)), LCASE("${safe}")))
  FILTER(STRSTARTS(STR(?uri), "http://vocab.getty.edu/page/tgn/"))
}
LIMIT ${Math.min(limit, 10)}
`.trim()

  const url = `https://vocab.getty.edu/sparql.json?query=${encodeURIComponent(query)}`

  const res = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json' },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    return { error: `Getty TGN search returned ${res.status}` }
  }

  const data = (await res.json()) as {
    results?: { bindings?: Array<{ uri?: { value?: string }; label?: { value?: string } }> }
  }

  const bindings = data.results?.bindings ?? []
  return bindings
    .map((row) => ({
      uri: row.uri?.value ?? '',
      label: row.label?.value ?? '',
    }))
    .filter((hit) => hit.uri && hit.label)
}

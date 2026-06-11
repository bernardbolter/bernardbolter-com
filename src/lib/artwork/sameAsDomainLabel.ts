const DOMAIN_LABELS: Record<string, string> = {
  'artsy.net': 'Artsy',
  'www.artsy.net': 'Artsy',
  'artnet.com': 'Artnet',
  'www.artnet.com': 'Artnet',
  'wikidata.org': 'Wikidata',
  'www.wikidata.org': 'Wikidata',
}

export function labelForSameAsUri(uri: string): string {
  try {
    const host = new URL(uri).hostname.toLowerCase()
    if (DOMAIN_LABELS[host]) return DOMAIN_LABELS[host]
    return host.replace(/^www\./, '')
  } catch {
    return uri
  }
}
